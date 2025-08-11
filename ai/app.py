import re
import uuid
import io
import json
import traceback
import PyPDF2
import spacy
from spacy.matcher import Matcher, PhraseMatcher
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks, Request, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field, validator 
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from groq import Groq
from functools import lru_cache
from pathlib import Path
from bson import ObjectId

from typing import Dict, Any

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel

# Import MongoDB client
from mongodb_client import mongodb, init_database, close_database

# Global variable to track database connection status
database_connected = False


# Load environment variables
load_dotenv()

# Initialize Groq
# Available current models (as of 2025):
# - llama-3.1-8b-instant (fast, good quality)
# - llama-3.1-70b-versatile (decommissioned - do not use)
# - mixtral-8x7b-32768 (good for longer contexts)
# - gemma-7b-it (Google's Gemma model)
# - llama3-groq-8b-8192-tool-use-preview (for tool use)
# Check https://console.groq.com/docs/models for latest available models

client = None
try:
    groq_api_key = os.getenv("GROQ_API_KEY")
    if groq_api_key and groq_api_key != "your_groq_api_key_here":
        client = Groq(api_key=groq_api_key)
        print("✅ Groq configured successfully")
    else:
        print("⚠️ Groq API key not configured - AI features will be limited")
except Exception as e:
    print(f"❌ Groq configuration failed: {e}")
    print("⚠️ Continuing without Groq - AI features will be limited")

# Initialize FastAPI
app = FastAPI(
    title="AI Resume Parser with MongoDB Backend",
    version="1.0",
    debug=True
)

# Add startup and shutdown events
@app.on_event("startup")
async def on_startup():
    await startup_event()

@app.on_event("shutdown")
async def on_shutdown():
    await shutdown_event()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RawResumeData(BaseModel):
    raw_text: str
    processed_data: Dict[str, Any]

async def extract_raw_text_from_pdf(file: UploadFile) -> str:
    """Extract raw text from PDF without any processing"""
    try:
        if file.content_type != "application/pdf":
            raise ValueError("Only PDF files are accepted")
            
        contents = await file.read()
        if not contents:
            raise ValueError("Empty file uploaded")
            
        if len(contents) > 5 * 1024 * 1024:
            raise ValueError("File too large (max 5MB)")
            
        pdf_file = io.BytesIO(contents)
        reader = PyPDF2.PdfReader(pdf_file)
        if len(reader.pages) == 0:
            raise ValueError("PDF contains no pages")
            
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        if not text.strip():
            raise ValueError("No text could be extracted from PDF")
            
        file.file.seek(0)
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF processing failed: {str(e)}")

async def process_with_groq(raw_text: str) -> Dict[str, Any]:
    """Send raw text to Groq for comprehensive resume processing"""
    prompt = f"""
    You are an expert resume parser and HR analyst. Analyze this resume and extract ALL information in a comprehensive, structured format.
    
    Extract and structure the following information:
    
    1. PERSONAL INFORMATION:
    - Full name (first, middle, last)
    - Email address
    - Phone number
    - Location/Address
    - LinkedIn URL (if present)
    - GitHub URL (if present)
    - Portfolio URL (if present)
    - Other social media profiles
    
    2. EDUCATION:
    - Degree/Qualification name
    - Institution/University name
    - Graduation year
    - GPA/CGPA (if mentioned)
    - Field of study/Major
    - Honors/Awards
    - Relevant coursework
    
    3. WORK EXPERIENCE:
    - Job title/Position
    - Company/Organization name
    - Start date and end date (or "Present")
    - Location (city, country)
    - Key responsibilities and achievements
    - Technologies/tools used
    - Team size managed (if applicable)
    - Projects worked on
    
    4. SKILLS (categorize properly):
    - Programming Languages
    - Frameworks & Libraries
    - Databases
    - Cloud Platforms
    - DevOps Tools
    - Design Tools
    - Soft Skills
    - Languages (spoken/written)
    - Certifications
    
    5. PROJECTS:
    - Project name
    - Description
    - Technologies used
    - Duration
    - Role/Contribution
    - Links/GitHub repos
    
    6. CERTIFICATIONS:
    - Certification name
    - Issuing organization
    - Date obtained
    - Expiry date (if applicable)
    - Credential ID
    
    7. ACHIEVEMENTS & AWARDS:
    - Award name
    - Issuing organization
    - Date received
    - Description
    
    8. ANALYSIS:
    - Years of experience
    - Industry focus
    - Career level (Junior/Mid/Senior)
    - ATS score (0-100) based on:
      * Resume formatting and structure
      * Keyword relevance and density
      * Completeness of information
      * Professional language use
      * Overall quality and readability
    
    Return ONLY a valid JSON object with this structure:
    {{
        "personal_information": {{
            "name": "Full Name",
            "email": "email@example.com",
            "phone": "+1234567890",
            "location": "City, State, Country",
            "linkedin": "https://linkedin.com/in/...",
            "github": "https://github.com/...",
            "portfolio": "https://...",
            "other_profiles": []
        }},
        "education": [
            {{
                "degree": "Bachelor of Science in Computer Science",
                "institution": "University Name",
                "graduation_year": "2023",
                "gpa": "3.8",
                "field_of_study": "Computer Science",
                "honors": ["Dean's List", "Summa Cum Laude"],
                "coursework": ["Data Structures", "Algorithms"]
            }}
        ],
        "work_experience": [
            {{
                "title": "Software Engineer",
                "company": "Company Name",
                "start_date": "2022-01",
                "end_date": "Present",
                "location": "City, State",
                "responsibilities": ["Responsibility 1", "Responsibility 2"],
                "technologies": ["Python", "React", "AWS"],
                "team_size": 5,
                "projects": ["Project 1", "Project 2"]
            }}
        ],
        "skills": {{
            "programming_languages": ["Python", "JavaScript", "Java"],
            "frameworks": ["React", "Django", "Spring"],
            "databases": ["PostgreSQL", "MongoDB"],
            "cloud_platforms": ["AWS", "Azure"],
            "devops_tools": ["Docker", "Kubernetes"],
            "design_tools": ["Figma", "Adobe XD"],
            "soft_skills": ["Leadership", "Communication"],
            "languages": ["English", "Spanish"],
            "certifications": ["AWS Certified", "PMP"]
        }},
        "projects": [
            {{
                "name": "Project Name",
                "description": "Project description",
                "technologies": ["Tech1", "Tech2"],
                "duration": "3 months",
                "role": "Lead Developer",
                "links": ["https://github.com/..."]
            }}
        ],
        "certifications": [
            {{
                "name": "Certification Name",
                "organization": "Issuing Organization",
                "date_obtained": "2023-01",
                "expiry_date": "2025-01",
                "credential_id": "CERT123"
            }}
        ],
        "achievements": [
            {{
                "name": "Achievement Name",
                "organization": "Issuing Organization",
                "date": "2023-01",
                "description": "Achievement description"
            }}
        ],
        "analysis": {{
            "years_of_experience": 3.5,
            "industry_focus": "Technology",
            "career_level": "Mid",
            "ats_score": 85
        }}
    }}
    
    RAW RESUME TEXT:
    {raw_text[:8000]}  # First 8,000 characters to avoid token limits
    
    IMPORTANT: Return ONLY the JSON object. No explanations, no markdown formatting, just pure JSON.
    """
    
    try:
        if not client:
            raise HTTPException(
                status_code=503,
                detail="Groq AI service not available. Please try basic parsing instead."
            )
        
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are an expert resume parser and HR analyst. You must return only valid JSON without any markdown formatting or explanations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=6000
        )
        
        json_str = response.choices[0].message.content
        print(f"Raw Groq response: {json_str[:500]}...")
        
        # Clean the response if it contains markdown code blocks
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0].strip()
        
        # Find JSON object
        start_idx = json_str.find('{')
        end_idx = json_str.rfind('}') + 1
        if start_idx != -1 and end_idx != 0:
            json_str = json_str[start_idx:end_idx]
        
        parsed_data = json.loads(json_str)
        print(f"✅ Successfully parsed resume data with {len(parsed_data)} top-level keys")
        
        return parsed_data
    except json.JSONDecodeError as e:
        error_msg = f"Failed to parse JSON response: {str(e)}"
        print(f"❌ JSON parsing error: {error_msg}")
        print(f"Raw response: {json_str if 'json_str' in locals() else 'No response'}")
        raise HTTPException(
            status_code=500,
            detail=f"AI response parsing failed: {error_msg}"
        )
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Groq processing error: {error_msg}")
        if "quota" in error_msg.lower() or "429" in error_msg or "rate limit" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="AI service quota exceeded. Please try again later or use basic parsing features."
            )
        raise HTTPException(
            status_code=500,
            detail=f"AI processing failed: {error_msg}"
        )
    
RESUMES_JSON_FILE = "resumes_data.json"

def initialize_resumes_file():
    """Create the JSON file if it doesn't exist with an empty list"""
    if not Path(RESUMES_JSON_FILE).exists():
        with open(RESUMES_JSON_FILE, 'w') as f:
            json.dump([], f)

def append_resume_to_file(new_resume: Dict[str, Any]) -> bool:
    """
    Append a new resume to the JSON file if it doesn't already exist.
    Returns True if resume was added, False if it already existed.
    """
    try:
        # Read existing data
        with open(RESUMES_JSON_FILE, 'r') as f:
            existing_data: List[Dict[str, Any]] = json.load(f)
        
        if "email" in new_resume and new_resume["email"]:
            for existing_resume in existing_data:
                if "email" in existing_resume and existing_resume["email"] == new_resume["email"]:
                    print(f"Resume with email {new_resume['email']} already exists. Skipping.")
                    return False
        
        # As a fallback, also check by name if email is missing
        elif "name" in new_resume and new_resume["name"]:
            for existing_resume in existing_data:
                if "name" in existing_resume and existing_resume["name"] == new_resume["name"]:
                    print(f"Resume with name {new_resume['name']} already exists. Skipping.")
                    return False
        
        # Append new resume only if it doesn't exist
        existing_data.append(new_resume)
        
        # Write back to file
        with open(RESUMES_JSON_FILE, 'w') as f:
            json.dump(existing_data, f, indent=2)
        
        print(f"Added new resume to file: {new_resume.get('email', new_resume.get('name', 'Unknown'))}")
        return True
            
    except Exception as e:
        print(f"Failed to update resumes file: {str(e)}")
        raise Exception(f"Failed to update resumes file: {str(e)}")

# Initialize the file when module loads
initialize_resumes_file()

# Then modify your existing send_data endpoint like this:
@app.post("/send-data", response_model=RawResumeData)
async def send_data(file: UploadFile = File(...)):
    """Endpoint that sends raw resume data to Groq for processing"""
    try:
        # 1. Extract raw text from PDF
        raw_text = await extract_raw_text_from_pdf(file)
        
        # 2. Send directly to Groq for processing
        raw_processed_data = await process_with_groq(raw_text)
        
        # 3. Normalize the data to consistent format
        processed_data = normalize_resume_data(raw_processed_data)
        
        # 4. Append to JSON file if not already exists (legacy support)
        was_added_to_file = append_resume_to_file(processed_data)
        
        # 5. Also save to MongoDB if connected
        was_added_to_db = False
        if database_connected:
            try:
                # Check if resume already exists in MongoDB
                existing_resume = None
                email = processed_data.get("personal_info", {}).get("email")
                name = processed_data.get("personal_info", {}).get("name")
                
                if email:
                    existing_resume = await mongodb.find_one("extracted_resume_data", {"personal_info.email": email})
                elif name:
                    existing_resume = await mongodb.find_one("extracted_resume_data", {"personal_info.name": name})
                
                if not existing_resume:
                    # Add metadata
                    resume_doc = {
                        **processed_data,
                        "raw_text": raw_text,
                        "uploaded_at": datetime.now().isoformat(),
                        "filename": file.filename,
                        "id": str(uuid.uuid4()),
                        "created_at": datetime.now().isoformat()
                    }
                    
                    # Save to MongoDB
                    await mongodb.insert_one("extracted_resume_data", resume_doc)
                    print(f"✅ Resume saved to MongoDB: {email or name or 'Unknown'}")
                    was_added_to_db = True
                else:
                    print(f"Resume already exists in MongoDB: {email or name or 'Unknown'}")
                    
            except Exception as e:
                print(f"Failed to save resume to MongoDB: {str(e)}")
        
        response_data = RawResumeData(
            raw_text=raw_text[:1000] + "... [truncated]",
            processed_data=processed_data
        )
        
        # Add a note about whether the resume was added or already existed
        if not was_added_to_file and not was_added_to_db:
            response_data.processed_data["note"] = "Resume already exists in database"
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Resume processing failed: {str(e)}"
        )
# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
    print("✅ spaCy model loaded successfully")
except Exception as e:
    print(f"❌ spaCy model loading failed: {e}")
    raise

# Initialize MongoDB
database_connected = False
async def startup_event():
    """Initialize database connection on startup"""
    global database_connected
    database_connected = await init_database()
    if database_connected:
        print("✅ MongoDB connection successful")
    else:
        print("⚠️ MongoDB not configured - running without database")

async def shutdown_event():
    """Close database connection on shutdown"""
    await close_database()

# Constants
SKILL_BLACKLIST = {
    "and", "the", "with", "using", "via", "from", "to", 
    "in", "on", "at", "for", "my", "our", "we", "i",
    "|", "", " ", "  ", "-", "•", ":", ";", ",", "."
}

TECHNICAL_SKILLS = [
    "Python", "Java", "JavaScript", "C++", "SQL", "NoSQL", 
    "HTML", "CSS", "React", "Angular", "Node.js", "Django",
    "Flask", "TensorFlow", "PyTorch", "Machine Learning",
    "Data Science", "Data Analysis", "Android Development",
    "IoT", "Cloud Computing", "AWS", "Azure", "Git",
    "REST API", "GraphQL", "Docker", "Kubernetes",
    "Computer Engineering", "Research", "Web Development"
]

# Models
class EnhancedResumeData(BaseModel):
    resume_text: str
    job_description: str
    education: str
    industry: str
    applied_job_title: str
    experience_years: float
    salary_expectation: float
    skills: List[str]
    corrections_made: List[str] = Field(default_factory=list)

class ResumeData(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    resume_text: str
    extracted_skills: List[str]
    work_experience: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    certifications: Optional[List[str]] = None
    enhanced_data: Optional[EnhancedResumeData] = None

class JobApplication(BaseModel):
    job_id: str
    candidate_id: str

class Job(BaseModel):
    title: str
    description: str
    requirements: List[str]
    location: str
    salary_range: Optional[str] = None
    employment_type: str = "full_time"  # full_time, part_time, contract, internship, temporary
    company_name: Optional[str] = None
    status: str = "active"  # active, inactive, closed
    created_by: str  # HR user ID

class JobCreate(BaseModel):
    title: str
    description: str
    requirements: List[str]
    location: str
    salary_range: Optional[str] = None
    employment_type: str = "full_time"  # full_time, part_time, contract, internship, temporary
    company_name: Optional[str] = None

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    employment_type: Optional[str] = None
    company_name: Optional[str] = None
    status: Optional[str] = None

class JobWithCandidates(BaseModel):
    job: Dict[str, Any]
    candidates: List[ResumeData]

# Authentication models
class UserSignUp(BaseModel):
    email: str  # Changed from EmailStr to str to avoid validation issues
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "candidate"  # candidate or hr_user
    company_id: Optional[str] = None
    company_name: Optional[str] = None

class UserSignIn(BaseModel):
    email: str  # Changed from EmailStr to str to avoid validation issues
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    created_at: str

# Simple JWT-like token (in production, use proper JWT)
import hashlib
import secrets

def hash_password(password: str) -> str:
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Generate a simple session token"""
    return secrets.token_urlsafe(32)

# Helper Functions
def initialize_nlp_components():
    skill_patterns = list(nlp.pipe([
        skill for skill in TECHNICAL_SKILLS 
        if len(skill.split()) < 3
    ]))
    skill_matcher = PhraseMatcher(nlp.vocab)
    skill_matcher.add("SKILL", skill_patterns)

    experience_matcher = Matcher(nlp.vocab)
    experience_patterns = [
        [{"POS": "PROPN", "OP": "+"}, {"LOWER": "at"}, {"POS": "PROPN", "OP": "+"}],
        [{"POS": "PROPN", "OP": "+"}, {"LOWER": ","}, {"LOWER": "inc"}],
        [{"POS": "PROPN", "OP": "+"}, {"LOWER": "company"}],
    ]
    experience_matcher.add("EXPERIENCE", experience_patterns)

    return skill_matcher, experience_matcher

skill_matcher, experience_matcher = initialize_nlp_components()

def is_valid_skill(text):
    return (
        len(text) > 2 and
        not any(char.isdigit() for char in text) and
        text.lower() not in SKILL_BLACKLIST and
        not text.isspace() and
        not text.endswith((".", ",", ";", ":"))
    )

def extract_skills(doc) -> List[str]:
    skills = set()
    matches = skill_matcher(doc)
    for match_id, start, end in matches:
        skill = doc[start:end].text
        if is_valid_skill(skill):
            skills.add(skill)
    
    for sent in doc.sents:
        if any(kw in sent.text.lower() for kw in ["skill", "experience", "proficient"]):
            for token in sent:
                if (token.pos_ in ["NOUN", "PROPN"] and is_valid_skill(token.text)):
                    skills.add(token.text)
    
    return sorted({re.sub(r'[^\w\s]', '', s).strip() for s in skills if is_valid_skill(s)})

def extract_from_section(doc, section_title):
    section_content = []
    found_section = False
    for sent in doc.sents:
        if section_title.lower() in sent.text.lower():
            found_section = True
            continue
        if found_section and any(kw in sent.text.lower() for kw in ["experience", "education"]):
            break
        if found_section:
            section_content.append(sent.text)
    return " ".join(section_content)

async def extract_text_from_pdf(file: UploadFile) -> str:
    try:
        if file.content_type != "application/pdf":
            raise ValueError("Only PDF files are accepted")
            
        contents = await file.read()
        if not contents:
            raise ValueError("Empty file uploaded")
            
        if len(contents) > 5 * 1024 * 1024:
            raise ValueError("File too large (max 5MB)")
            
        pdf_file = io.BytesIO(contents)
        reader = PyPDF2.PdfReader(pdf_file)
        if len(reader.pages) == 0:
            raise ValueError("PDF contains no pages")
            
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        if not text.strip():
            raise ValueError("No text could be extracted from PDF")
            
        file.file.seek(0)
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"PDF processing failed: {str(e)}")

async def upload_resume_to_storage(file: UploadFile) -> str:
    """
    Mock file upload - returns a placeholder URL
    In production, you would upload to a cloud storage service like AWS S3, Google Cloud Storage, etc.
    """
    try:
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # For now, return a placeholder URL
        # In production, implement actual file upload to your preferred storage service
        placeholder_url = f"https://storage.example.com/resumes/{unique_filename}"
        
        return placeholder_url
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload resume: {str(e)}")

def extract_contact_info(doc) -> Dict[str, str]:
    contact_info = {"name": "", "email": "", "phone": ""}
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            contact_info["name"] = ent.text
            break
    
    emails = re.findall(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", doc.text)
    if emails:
        contact_info["email"] = emails[0]
    
    phones = re.findall(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", doc.text)
    if phones:
        contact_info["phone"] = phones[0]
    
    return contact_info

def extract_experience(doc) -> List[Dict[str, Any]]:
    experiences = []
    current_position = None
    current_dates = None
    
    for sent in doc.sents:
        if (" at " in sent.text or " for " in sent.text or 
            " intern " in sent.text.lower() or "internship" in sent.text.lower()):
            position = sent.text.split(" at ")[0] if " at " in sent.text else sent.text
            current_position = position.split(" for ")[0] if " for " in position else position
        
        date_matches = re.findall(
            r"((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]\s\d{4}|\d{4}).?((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4}|\d{4}|Present|Current)", 
            sent.text, 
            re.IGNORECASE
        )
        if date_matches:
            current_dates = f"{date_matches[0][0]} - {date_matches[0][2]}"
        
        if current_position and current_dates:
            experiences.append({
                "position": current_position.strip(),
                "duration": current_dates,
                "description": sent.text,
                "type": "internship" if "intern" in current_position.lower() else "work"
            })
            current_position = current_dates = None
    
    return experiences

def extract_education(doc) -> List[Dict[str, Any]]:
    education = []
    current_degree = None
    current_school = None
    
    for sent in doc.sents:
        if any(kw in sent.text for kw in ["Bachelor", "Master", "PhD", "Doctorate"]):
            current_degree = sent.text.split(" in ")[0] if " in " in sent.text else sent.text
        
        if any(kw in sent.text for kw in ["University", "College", "Institute"]):
            current_school = sent.text
        
        if current_degree and current_school:
            education.append({
                "degree": current_degree,
                "institution": current_school
            })
            current_degree = current_school = None
    
    return education

async def enhance_resume_with_groq(raw_text: str, extracted_data: dict) -> EnhancedResumeData:
    print(f"🔍 Enhancing resume with Groq...")
    print(f"📝 Raw text length: {len(raw_text)}")
    print(f"📊 Extracted data keys: {list(extracted_data.keys())}")
    
    # Safely convert extracted_data to JSON
    try:
        json_str = json.dumps(extracted_data, indent=2, default=str)
        print(f"✅ JSON conversion successful")
    except Exception as json_error:
        print(f"❌ JSON conversion failed: {json_error}")
        json_str = str(extracted_data)
    
    prompt = f"""
    Analyze this resume and enhance the extracted data:
    
    RAW TEXT EXCERPT:
    {raw_text[:3000]}
    
    CURRENT EXTRACTION:
    {json_str}
    
    Please return enhanced data in this exact format:
    {{
        "resume_text": "Enhanced professional summary",
        "job_description": "Matched job description",
        "education": "Standardized education",
        "industry": "Detected industry",
        "applied_job_title": "Suggested job title",
        "experience_years": X.X,
        "salary_expectation": XXXXX.X,
        "skills": ["Standardized", "Skills"],
        "corrections_made": ["List of corrections"]
    }}
    """
    
    try:
        if not client:
            print("Groq not available, using fallback data")
            return EnhancedResumeData(
                resume_text=extracted_data.get("resume_text", ""),
                job_description="",
                education=", ".join([edu.get("degree", "") for edu in extracted_data.get("education", [])]),
                industry="Technology", # Default industry
                applied_job_title="Software Developer", # Default title
                experience_years=len(extracted_data.get("work_experience", [])),
                salary_expectation=0,
                skills=extracted_data.get("extracted_skills", []),
                corrections_made=["Using basic parsing - Groq not available"]
            )
        
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are an expert resume analyzer. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=2000
        )
        
        json_str = response.choices[0].message.content
        # Clean the response if it contains markdown code blocks
        if "```json" in json_str:
            json_str = json_str.split("```json")[1].split("```")[0].strip()
        elif "```" in json_str:
            json_str = json_str.split("```")[1].split("```")[0].strip()
        
        # Find JSON object
        start_idx = json_str.find('{')
        end_idx = json_str.rfind('}') + 1
        if start_idx != -1 and end_idx != 0:
            json_str = json_str[start_idx:end_idx]
        
        return EnhancedResumeData(**json.loads(json_str))
    except Exception as e:
        error_msg = str(e)
        print(f"Groq enhancement failed: {error_msg}")
        
        # Provide meaningful fallback based on extracted data
        fallback_corrections = ["Groq enhancement failed"]
        if "quota" in error_msg.lower() or "429" in error_msg or "rate limit" in error_msg.lower():
            fallback_corrections = ["AI quota exceeded - using basic parsing"]
        
        return EnhancedResumeData(
            resume_text=extracted_data.get("resume_text", ""),
            job_description="",
            education=", ".join([edu.get("degree", "") for edu in extracted_data.get("education", [])]),
            industry="Technology", # Default industry
            applied_job_title="Software Developer", # Default title 
            experience_years=len(extracted_data.get("work_experience", [])),
            salary_expectation=0,
            skills=extracted_data.get("extracted_skills", []),
            corrections_made=fallback_corrections
        )

# Authentication Endpoints
@app.post("/auth/signup")
async def signup(user_data: UserSignUp):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await mongodb.users.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user document
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": user_data.email,
            "password": hashed_password,
            "first_name": user_data.first_name,
            "last_name": user_data.last_name,
            "role": user_data.role,
            "company_id": user_data.company_id,
            "company_name": user_data.company_name,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Insert user into database
        result = await mongodb.users.insert_one(user_doc)
        
        # Generate access token
        access_token = generate_token()
        
        # Store token in database (simple session management)
        token_doc = {
            "token": access_token,
            "user_id": user_doc["id"],
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat()
        }
        await mongodb.user_tokens.insert_one(token_doc)
        
        # Return user data (without password) and token
        user_response = UserResponse(
            id=user_doc["id"],
            email=user_doc["email"],
            first_name=user_doc["first_name"],
            last_name=user_doc["last_name"],
            role=user_doc["role"],
            created_at=user_doc["created_at"]
        )
        
        return {
            "user": user_response,
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signup error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during registration")

@app.post("/auth/signin")
async def signin(credentials: UserSignIn):
    """Sign in a user"""
    try:
        print(f"Signin attempt for email: {credentials.email}")
        print(f"Credentials received: {credentials}")
        
        # For development - create a test user if it doesn't exist
        test_user = {
            "id": "test-user-123",
            "email": credentials.email,
            "password": hash_password(credentials.password),
            "first_name": "Test",
            "last_name": "User",
            "role": "candidate",
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Find user by email
        user = await mongodb.users.find_one({"email": credentials.email})
        if not user:
            print(f"User not found for email: {credentials.email}, creating test user")
            # Insert test user for development
            await mongodb.users.insert_one(test_user)
            user = test_user
        
        print(f"User found: {user.get('email')}")
        
        # Check if user has password field
        if "password" not in user:
            print(f"User {user.get('email')} missing password field, updating...")
            # Add password field if missing
            hashed_password = hash_password(credentials.password)
            await mongodb.users.update_one(
                {"email": credentials.email},
                {"$set": {"password": hashed_password}}
            )
            user["password"] = hashed_password
        
        # Verify password
        hashed_password = hash_password(credentials.password)
        if user["password"] != hashed_password:
            print("Password verification failed")
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        print("Password verified successfully")
        
        # Generate new access token
        access_token = generate_token()
        
        # Store token in database
        token_doc = {
            "token": access_token,
            "user_id": user["id"],
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(days=7)).isoformat()
        }
        await mongodb.user_tokens.insert_one(token_doc)
        
        # Return user data (without password) and token
        user_response = UserResponse(
            id=user["id"],
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            role=user["role"],
            created_at=user["created_at"]
        )
        
        return {
            "user": user_response,
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Signin error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during sign in")

@app.get("/auth/user")
async def get_current_user(request: Request):
    """Get current user from token"""
    try:
        # Extract token from Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Find token in database
        token_doc = await mongodb.user_tokens.find_one({"token": token})
        if not token_doc:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        # Check if token is expired
        expires_at = datetime.fromisoformat(token_doc["expires_at"])
        if datetime.utcnow() > expires_at:
            # Remove expired token
            await mongodb.user_tokens.delete_one({"token": token})
            raise HTTPException(status_code=401, detail="Token expired")
        
        # Find user
        user = await mongodb.users.find_one({"id": token_doc["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # Return user data (without password)
        user_response = UserResponse(
            id=user["id"],
            email=user["email"],
            first_name=user["first_name"],
            last_name=user["last_name"],
            role=user["role"],
            created_at=user["created_at"]
        )
        
        return {"user": user_response}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error getting current user: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def get_user_from_token(request: Request) -> dict:
    """Extract and validate user from Authorization token"""
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = auth_header.split(" ")[1]
    
    # Find token in database
    token_doc = await mongodb.user_tokens.find_one({"token": token})
    if not token_doc:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.utcnow() > expires_at:
        # Remove expired token
        await mongodb.user_tokens.delete_one({"token": token})
        raise HTTPException(status_code=401, detail="Token expired")
    
    # Find user
    user = await mongodb.users.find_one({"id": token_doc["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# API Endpoints
@app.post("/parse-resume/", response_model=ResumeData)
async def parse_resume(file: UploadFile = File(...)):
    try:
        print(f"📄 Processing resume: {file.filename}")
        text = await extract_text_from_pdf(file)
        print(f"✅ Text extracted, length: {len(text)}")
        
        doc = nlp(text)
        print("✅ spaCy processing complete")
        
        contact_info = extract_contact_info(doc)
        print(f"✅ Contact info extracted: {contact_info}")
        
        skills = extract_skills(doc)
        print(f"✅ Skills extracted: {len(skills)} skills found - Type: {type(skills)}")
        print(f"Skills content: {skills[:5] if skills else 'None'}")  # Show first 5 skills
        
        experience = extract_experience(doc) or []
        print(f"✅ Experience extracted: {len(experience)} jobs found - Type: {type(experience)}")
        if experience:
            print(f"First experience item type: {type(experience[0])}")
            print("First experience item keys:", list(experience[0].keys()) if isinstance(experience[0], dict) else "Not a dict")
        
        education = extract_education(doc) or []
        print(f"✅ Education extracted: {len(education)} entries found - Type: {type(education)}")
        if education:
            print(f"First education item type: {type(education[0])}")
            print("First education item keys:", list(education[0].keys()) if isinstance(education[0], dict) else "Not a dict")
        
        extracted_data = {
            "resume_text": text[:5000],
            "education": education,
            "work_experience": experience,
            "extracted_skills": skills,
            "contact_info": contact_info
        }
        print("✅ Initial data extraction complete")
        
        enhanced_data = await enhance_resume_with_groq(text, extracted_data)
        print(f"✅ Groq enhancement complete - Type: {type(enhanced_data)}")
        print(f"Enhanced skills type: {type(enhanced_data.skills)}")
        print(f"Enhanced skills content: {enhanced_data.skills[:5] if enhanced_data.skills else 'None'}")
        
        # Create the result directly without database storage first
        # Ensure skills is a list
        final_skills = enhanced_data.skills if isinstance(enhanced_data.skills, list) else []
        print(f"Final skills type: {type(final_skills)}, content: {final_skills}")
        
        try:
            result = ResumeData(
                name=contact_info.get("name", ""),
                email=contact_info.get("email", ""),
                phone=contact_info.get("phone", ""),
                resume_text=text,
                extracted_skills=final_skills,
                work_experience=experience,
                education=education,
                enhanced_data=enhanced_data
            )
            print("✅ ResumeData object created successfully")
            return result
        except Exception as create_error:
            print(f"❌ Error creating ResumeData object: {create_error}")
            print(f"❌ Contact info: {contact_info}")
            print(f"❌ Enhanced data: {enhanced_data}")
            print(f"❌ Skills: {final_skills}")
            print(f"❌ Experience: {experience}")
            print(f"❌ Education: {education}")
            raise HTTPException(status_code=500, detail=f"Error creating resume data: {str(create_error)}")
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Parse resume error: {str(e)}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(500, detail=str(e))

@app.post("/apply-job/")
async def apply_to_job(
    job_id: str = Form(...),
    candidate_id: str = Form(...),
    cover_letter: str = Form(""),  # Make cover_letter optional with default empty string
    full_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),  # Make phone optional with default empty string
    skills: str = Form(...),
    education: str = Form(...),
    experience: str = Form(...),
    certifications: str = Form(...),
    languages: str = Form(...),
    file: UploadFile = File(...),
    # Optional fields from frontend
    phone_number: str = Form(None),
    location: str = Form(None),
    linkedin_url: str = Form(None),
    github_url: str = Form(None),
    portfolio_url: str = Form(None)
):
    try:
        print(f"📝 [DEBUG] Job application request received")
        print(f"📝 [DEBUG] job_id: {job_id}")
        print(f"📝 [DEBUG] candidate_id: {candidate_id}")
        print(f"📝 [DEBUG] full_name: {full_name}")
        print(f"📝 [DEBUG] email: {email}")
        print(f"📝 [DEBUG] phone: {phone}")
        print(f"📝 [DEBUG] file: {file.filename if file else 'None'}")
        print(f"📝 [DEBUG] skills: {skills}")
        print(f"📝 [DEBUG] education: {education}")
        print(f"📝 [DEBUG] experience: {experience}")
        print(f"📝 [DEBUG] certifications: {certifications}")
        print(f"📝 [DEBUG] languages: {languages}")
        
        if not database_connected:
            raise HTTPException(status_code=503, detail="Database not configured - job applications not available")
        
        print(f"📝 Processing job application for job_id: {job_id}")
        print(f"👤 Candidate: {full_name} ({email})")
        
        # Check if job exists
        job = await mongodb.find_one("jobs", {"id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Check if candidate has already applied to this job
        existing_application = await mongodb.find_one("applications", {
            "job_id": job_id,
            "candidate_id": candidate_id
        })
        if existing_application:
            raise HTTPException(
                status_code=409, 
                detail="You have already applied to this job"
            )
        
        # Parse JSON fields
        import json
        try:
            skills_list = json.loads(skills) if skills else []
            education_list = json.loads(education) if education else []
            experience_list = json.loads(experience) if experience else []
            certifications_list = json.loads(certifications) if certifications else []
            languages_list = json.loads(languages) if languages else []
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error: {e}")
            skills_list = []
            education_list = []
            experience_list = []
            certifications_list = []
            languages_list = []
        
        # Process and store resume data using the same logic as ResumeParserTest
        resume_filename = None
        extracted_resume_id = None
        
        if file:
            resume_filename = f"resume_{candidate_id}_{job_id}_{file.filename}"
            
            try:
                print(f"📄 Processing resume for job application: {file.filename}")
                
                # Extract text from the resume
                text = await extract_text_from_pdf(file)
                print(f"✅ Text extracted for job application, length: {len(text)}")
                
                # Process with spaCy
                doc = nlp(text)
                
                # Extract information
                contact_info = extract_contact_info(doc)
                extracted_skills = extract_skills(doc)
                experience = extract_experience(doc) or []
                education = extract_education(doc) or []
                
                # Prepare extracted data for Groq enhancement
                extracted_data = {
                    "resume_text": text[:5000],
                    "education": education,
                    "work_experience": experience,
                    "extracted_skills": extracted_skills,
                    "contact_info": contact_info
                }
                
                # Enhance with Groq
                enhanced_data = await enhance_resume_with_groq(text, extracted_data)
                
                # Prepare resume data for storage (similar to ResumeParserTest format)
                processed_data = {
                    "personal_info": {
                        "name": contact_info.get("name", full_name),
                        "email": contact_info.get("email", email),
                        "phone": contact_info.get("phone", phone),
                    },
                    "skills": {
                        "technical_skills": enhanced_data.skills if isinstance(enhanced_data.skills, list) else [],
                        "all_skills": extracted_skills
                    },
                    "education": education,
                    "experience": experience,
                    "enhanced_data": {
                        "industry": enhanced_data.industry,
                        "job_title": enhanced_data.applied_job_title,
                        "experience_years": enhanced_data.experience_years,
                        "salary_expectation": enhanced_data.salary_expectation,
                        "corrections_made": enhanced_data.corrections_made
                    }
                }
                
                # Store in extracted_resume_data collection
                try:
                    # Check if resume already exists
                    existing_resume = await mongodb.find_one("extracted_resume_data", {
                        "personal_info.email": contact_info.get("email", email)
                    })
                    
                    if not existing_resume:
                        resume_doc = {
                            **processed_data,
                            "raw_text": text,
                            "uploaded_at": datetime.now().isoformat(),
                            "filename": file.filename,
                            "id": str(uuid.uuid4()),
                            "created_at": datetime.now().isoformat(),
                            "source": "job_application",
                            "job_id": job_id,
                            "candidate_id": candidate_id
                        }
                        
                        extracted_resume_id = await mongodb.insert_one("extracted_resume_data", resume_doc)
                        print(f"✅ Resume data stored in extracted_resume_data: {extracted_resume_id}")
                    else:
                        extracted_resume_id = existing_resume.get("id")
                        print(f"Resume already exists in extracted_resume_data: {extracted_resume_id}")
                        
                except Exception as e:
                    print(f"❌ Failed to store resume data: {str(e)}")
                    
            except Exception as e:
                print(f"❌ Resume processing error: {str(e)}")
                # Continue with application even if resume processing fails
                
        application_data = {
            "id": str(uuid.uuid4()),
            "candidate_id": candidate_id,
            "user_id": candidate_id,  # Use candidate_id as user_id
            "job_id": job_id,
            "cover_letter": cover_letter,
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "skills": skills_list,
            "education": education_list,
            "experience": experience_list,
            "certifications": certifications_list,
            "languages": languages_list,
            "resume_filename": resume_filename,
            "extracted_resume_id": extracted_resume_id,  # Link to extracted resume data
            # Additional candidate profile data
            "phone_number": phone_number,
            "location": location,
            "linkedin_url": linkedin_url,
            "github_url": github_url,
            "portfolio_url": portfolio_url,
            "applied_at": datetime.now().isoformat(),
            "status": "submitted"
        }
        
        application_id = await mongodb.insert_one("applications", application_data)
        
        print(f"✅ Application submitted successfully: {application_id}")
        
        return {
            "message": "Application submitted successfully", 
            "application_id": str(application_id),
            "status": "success"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Application submission error: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Application submission failed: {str(e)}")

# Get single job by ID
@app.get("/api/jobs/{job_id}")
async def get_job_by_id(job_id: str):
    """Get a single job by ID"""
    try:
        if not database_connected:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        job = await mongodb.jobs.find_one({"id": job_id})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        # Convert ObjectId to string for JSON serialization
        job = convert_objectid_to_str(job)
        
        return job
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch job: {str(e)}")

# Get jobs by HR user
@app.get("/api/jobs/hr/{user_id}")
async def get_jobs_by_hr(user_id: str):
    """Get all jobs created by a specific HR user"""
    try:
        if not database_connected:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        jobs = await mongodb.jobs.find({"created_by": user_id}).to_list(None)
        
        return create_json_response({"jobs": jobs})
        
    except Exception as e:
        print(f"❌ Error fetching HR jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch HR jobs: {str(e)}")

# Get all active jobs (for candidates to browse)
@app.get("/api/jobs")
async def get_all_jobs():
    """Get all active job postings"""
    try:
        if not database_connected:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get all active jobs
        jobs = await mongodb.jobs.find({"status": "active"}).to_list(None)
        
        return create_json_response(jobs)
        
    except Exception as e:
        print(f"❌ Error fetching jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch jobs: {str(e)}")

# Create a new job
@app.post("/api/jobs")
async def create_job(job: JobCreate, request: Request):
    """Create a new job posting"""
    try:
        if not database_connected:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get user from token
        user = await get_user_from_token(request)
        
        # Verify user is HR
        if user.get("role") != "hr_user":
            raise HTTPException(status_code=403, detail="Only HR users can create jobs")
        
        # Create job document
        job_id = str(uuid.uuid4())
        job_data = {
            "id": job_id,
            "title": job.title,
            "description": job.description,
            "requirements": job.requirements,
            "location": job.location,
            "salary_range": job.salary_range,
            "employment_type": job.employment_type,
            "company_name": job.company_name,
            "status": "active",
            "created_by": user["id"],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        await mongodb.jobs.insert_one(job_data)
        
        # Convert ObjectId to string for JSON serialization
        job_data = convert_objectid_to_str(job_data)
        
        return {"message": "Job created successfully", "job_id": job_id, "job": job_data}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error creating job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create job: {str(e)}")

# Update a job
@app.put("/api/jobs/{job_id}")
async def update_job(job_id: str, job_update: JobUpdate, request: Request):
    """Update an existing job posting"""
    try:
        if not database_connected:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get user from token
        user = await get_user_from_token(request)
        
        # Check if job exists and user has permission
        existing_job = await mongodb.jobs.find_one({"id": job_id})
        if not existing_job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if existing_job["created_by"] != user["id"]:
            raise HTTPException(status_code=403, detail="You can only update your own job postings")
        
        # Prepare update data
        update_data = {}
        for field, value in job_update.dict(exclude_unset=True).items():
            if value is not None:
                update_data[field] = value
        
        if update_data:
            update_data["updated_at"] = datetime.utcnow().isoformat()
            await mongodb.jobs.update_one({"id": job_id}, {"$set": update_data})
        
        # Get updated job
        updated_job = await mongodb.jobs.find_one({"id": job_id})
        
        # Convert ObjectId to string for JSON serialization
        updated_job = convert_objectid_to_str(updated_job)
        
        return {"message": "Job updated successfully", "job": updated_job}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update job: {str(e)}")

# Delete a job
@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str, request: Request):
    """Delete a job posting"""
    try:
        if not database_connected:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # Get user from token
        user = await get_user_from_token(request)
        
        # Check if job exists and user has permission
        existing_job = await mongodb.jobs.find_one({"id": job_id})
        if not existing_job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        if existing_job["created_by"] != user["id"]:
            raise HTTPException(status_code=403, detail="You can only delete your own job postings")
        
        # Delete the job
        await mongodb.jobs.delete_one({"id": job_id})
        
        # Also delete associated applications
        await mongodb.applications.delete_many({"job_id": job_id})
        
        return {"message": "Job deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting job: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete job: {str(e)}")

def normalize_resume_data(raw_ai_response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize AI response to a consistent resume format
    """
    normalized = {
        "personal_info": {},
        "education": [],
        "work_experience": [],
        "skills": {
            "technical": [],
            "soft": [],
            "programming_languages": [],
            "frameworks": [],
            "databases": [],
            "cloud_platforms": [],
            "devops_tools": [],
            "design_tools": [],
            "languages": [],
            "certifications": []
        },
        "projects": [],
        "certifications": [],
        "achievements": [],
        "ats_score": 0,
        "analysis": {
            "years_of_experience": 0,
            "industry_focus": "Technology",
            "career_level": "Junior"
        }
    }
    
    # Extract personal information
    personal_info = raw_ai_response.get("personal_information", {}) or {}
    
    normalized["personal_info"]["name"] = personal_info.get("name", "")
    normalized["personal_info"]["email"] = personal_info.get("email", "")
    normalized["personal_info"]["phone"] = personal_info.get("phone", "")
    normalized["personal_info"]["location"] = personal_info.get("location", "")
    normalized["personal_info"]["linkedin"] = personal_info.get("linkedin", "")
    normalized["personal_info"]["github"] = personal_info.get("github", "")
    normalized["personal_info"]["portfolio"] = personal_info.get("portfolio", "")
    
    # Education
    education = raw_ai_response.get("education", [])
    if isinstance(education, list):
        for edu in education:
            if isinstance(edu, dict):
                normalized["education"].append({
                    "degree": edu.get("degree", ""),
                    "institution": edu.get("institution", ""),
                    "graduation_year": edu.get("graduation_year", ""),
                    "gpa": edu.get("gpa", ""),
                    "field_of_study": edu.get("field_of_study", ""),
                    "honors": edu.get("honors", []),
                    "coursework": edu.get("coursework", [])
                })
    
    # Work experience
    work_exp = raw_ai_response.get("work_experience", [])
    if isinstance(work_exp, list):
        for exp in work_exp:
            if isinstance(exp, dict):
                normalized["work_experience"].append({
                    "title": exp.get("title", ""),
                    "company": exp.get("company", ""),
                    "start_date": exp.get("start_date", ""),
                    "end_date": exp.get("end_date", ""),
                    "location": exp.get("location", ""),
                    "responsibilities": exp.get("responsibilities", []),
                    "technologies": exp.get("technologies", []),
                    "team_size": exp.get("team_size", ""),
                    "projects": exp.get("projects", [])
                })
    
    # Skills - handle both old and new formats
    skills = raw_ai_response.get("skills", {})
    if isinstance(skills, dict):
        # New comprehensive format
        normalized["skills"]["programming_languages"] = skills.get("programming_languages", [])
        normalized["skills"]["frameworks"] = skills.get("frameworks", [])
        normalized["skills"]["databases"] = skills.get("databases", [])
        normalized["skills"]["cloud_platforms"] = skills.get("cloud_platforms", [])
        normalized["skills"]["devops_tools"] = skills.get("devops_tools", [])
        normalized["skills"]["design_tools"] = skills.get("design_tools", [])
        normalized["skills"]["soft_skills"] = skills.get("soft_skills", [])
        normalized["skills"]["languages"] = skills.get("languages", [])
        normalized["skills"]["certifications"] = skills.get("certifications", [])
        
        # Combine technical skills
        all_technical = []
        all_technical.extend(skills.get("programming_languages", []))
        all_technical.extend(skills.get("frameworks", []))
        all_technical.extend(skills.get("databases", []))
        all_technical.extend(skills.get("cloud_platforms", []))
        all_technical.extend(skills.get("devops_tools", []))
        all_technical.extend(skills.get("design_tools", []))
        normalized["skills"]["technical"] = list(set(all_technical))
        
        # Soft skills
        normalized["skills"]["soft"] = skills.get("soft_skills", [])
    
    # Projects
    projects = raw_ai_response.get("projects", [])
    if isinstance(projects, list):
        for project in projects:
            if isinstance(project, dict):
                normalized["projects"].append({
                    "name": project.get("name", ""),
                    "description": project.get("description", ""),
                    "technologies": project.get("technologies", []),
                    "duration": project.get("duration", ""),
                    "role": project.get("role", ""),
                    "links": project.get("links", [])
                })
    
    # Certifications
    certs = raw_ai_response.get("certifications", [])
    if isinstance(certs, list):
        for cert in certs:
            if isinstance(cert, dict):
                normalized["certifications"].append({
                    "name": cert.get("name", ""),
                    "organization": cert.get("organization", ""),
                    "date_obtained": cert.get("date_obtained", ""),
                    "expiry_date": cert.get("expiry_date", ""),
                    "credential_id": cert.get("credential_id", "")
                })
    
    # Achievements
    achievements = raw_ai_response.get("achievements", [])
    if isinstance(achievements, list):
        for achievement in achievements:
            if isinstance(achievement, dict):
                normalized["achievements"].append({
                    "name": achievement.get("name", ""),
                    "organization": achievement.get("organization", ""),
                    "date": achievement.get("date", ""),
                    "description": achievement.get("description", "")
                })
    
    # Analysis
    analysis = raw_ai_response.get("analysis", {})
    if isinstance(analysis, dict):
        normalized["analysis"]["years_of_experience"] = analysis.get("years_of_experience", 0)
        normalized["analysis"]["industry_focus"] = analysis.get("industry_focus", "Technology")
        normalized["analysis"]["career_level"] = analysis.get("career_level", "Junior")
        normalized["ats_score"] = analysis.get("ats_score", 0)
    
    # Fallback ATS score if not in analysis
    if normalized["ats_score"] == 0:
        normalized["ats_score"] = raw_ai_response.get("ats_score", 0)
    
    return normalized

def convert_objectid_to_str(obj):
    """Recursively convert MongoDB ObjectId to string for JSON serialization"""
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: convert_objectid_to_str(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectid_to_str(item) for item in obj]
    else:
        return obj

def create_json_response(content: Any, status_code: int = 200):
    """Create a JSONResponse with ObjectId conversion"""
    converted_content = convert_objectid_to_str(content)
    return JSONResponse(content=converted_content, status_code=status_code)

@app.post("/enhanced-resume-processing")
async def enhanced_resume_processing(file: UploadFile = File(...)):
    """Enhanced resume processing endpoint with comprehensive extraction and detailed response"""
    try:
        print(f"🔄 Starting enhanced resume processing for: {file.filename}")
        
        # 1. Extract raw text from PDF
        raw_text = await extract_raw_text_from_pdf(file)
        print(f"✅ Raw text extracted, length: {len(raw_text)} characters")
        
        # 2. Process with Groq for comprehensive extraction
        try:
            raw_processed_data = await process_with_groq(raw_text)
            print(f"✅ Groq processing completed successfully")
        except Exception as groq_error:
            print(f"⚠️ Groq processing failed: {groq_error}")
            # Fallback to basic spaCy processing
            doc = nlp(raw_text)
            contact_info = extract_contact_info(doc)
            extracted_skills = extract_skills(doc)
            experience = extract_experience(doc) or []
            education = extract_education(doc) or []
            
            raw_processed_data = {
                "personal_information": contact_info,
                "education": education,
                "work_experience": experience,
                "skills": {
                    "technical": extracted_skills,
                    "soft": []
                },
                "analysis": {
                    "years_of_experience": len(experience),
                    "industry_focus": "Technology",
                    "career_level": "Junior",
                    "ats_score": 50  # Default score for basic processing
                }
            }
        
        # 3. Normalize the data to consistent format
        processed_data = normalize_resume_data(raw_processed_data)
        print(f"✅ Data normalized successfully")
        
        # 4. Save to MongoDB if connected
        was_added_to_db = False
        resume_id = None
        
        if database_connected:
            try:
                # Check if resume already exists
                existing_resume = None
                email = processed_data.get("personal_info", {}).get("email")
                name = processed_data.get("personal_info", {}).get("name")
                
                if email:
                    existing_resume = await mongodb.find_one("extracted_resume_data", {"personal_info.email": email})
                elif name:
                    existing_resume = await mongodb.find_one("extracted_resume_data", {"personal_info.name": name})
                
                if not existing_resume:
                    # Create comprehensive resume document
                    resume_doc = {
                        **processed_data,
                        "raw_text": raw_text,
                        "uploaded_at": datetime.now().isoformat(),
                        "filename": file.filename,
                        "id": str(uuid.uuid4()),
                        "created_at": datetime.now().isoformat(),
                        "processing_method": "enhanced",
                        "ai_model_used": "groq-llama-3.1-8b-instant",
                        "extraction_quality": "comprehensive"
                    }
                    
                    # Save to MongoDB
                    resume_id = await mongodb.insert_one("extracted_resume_data", resume_doc)
                    print(f"✅ Resume saved to MongoDB with ID: {resume_id}")
                    was_added_to_db = True
                else:
                    resume_id = existing_resume.get("id")
                    print(f"ℹ️ Resume already exists in MongoDB: {email or name or 'Unknown'}")
                    
            except Exception as e:
                print(f"❌ Failed to save resume to MongoDB: {str(e)}")
        
        # 5. Prepare comprehensive response
        response_data = {
            "success": True,
            "filename": file.filename,
            "raw_text": raw_text[:1000] + "... [truncated]",
            "processed_data": processed_data,
            "extraction_summary": {
                "personal_info_extracted": bool(processed_data.get("personal_info", {}).get("name")),
                "email_found": bool(processed_data.get("personal_info", {}).get("email")),
                "phone_found": bool(processed_data.get("personal_info", {}).get("phone")),
                "education_count": len(processed_data.get("education", [])),
                "experience_count": len(processed_data.get("work_experience", [])),
                "skills_count": len(processed_data.get("skills", {}).get("technical", [])),
                "projects_count": len(processed_data.get("projects", [])),
                "certifications_count": len(processed_data.get("certifications", [])),
                "ats_score": processed_data.get("ats_score", 0),
                "career_level": processed_data.get("analysis", {}).get("career_level", "Unknown"),
                "years_experience": processed_data.get("analysis", {}).get("years_of_experience", 0)
            },
            "database_info": {
                "saved_to_db": was_added_to_db,
                "resume_id": resume_id,
                "already_exists": not was_added_to_db and resume_id is not None
            },
            "processing_info": {
                "processing_method": "enhanced",
                "ai_model_used": "groq-llama-3.1-8b-instant",
                "processing_time": "real-time"
            }
        }
        
        print(f"✅ Enhanced resume processing completed successfully")
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Enhanced resume processing failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Enhanced resume processing failed: {str(e)}"
        )

@app.get("/process-and-match-resumes")
async def process_and_match_resumes():
    """
    Process resumes from MongoDB and return a simplified ranking
    """
    try:
        print("🔄 Processing and matching resumes...")
        
        if not database_connected:
            raise HTTPException(status_code=503, detail="Database not connected")
        
        # Get all resumes from MongoDB
        resumes = await mongodb.find_many("extracted_resume_data", {})
        
        if not resumes:
            print("ℹ️ No resumes found in database")
            return {"candidates": []}
        
        print(f"📊 Found {len(resumes)} resumes in database")
        
        # Create simplified candidate rankings based on ATS scores and experience
        ranked_candidates = []
        
        for resume in resumes:
            try:
                # Extract basic information
                personal_info = resume.get("personal_info", {})
                name = personal_info.get("name", "Unknown")
                email = personal_info.get("email", "")
                
                # Calculate match score based on available data
                ats_score = resume.get("ats_score", 50)
                analysis = resume.get("analysis", {})
                years_experience = analysis.get("years_of_experience", 0)
                career_level = analysis.get("career_level", "Junior")
                
                # Get skills count
                skills = resume.get("skills", {})
                technical_skills = skills.get("technical", [])
                skills_count = len(technical_skills)
                
                # Calculate a simple match score
                # Base score from ATS, bonus for experience and skills
                match_score = ats_score
                if years_experience > 0:
                    match_score += min(years_experience * 2, 20)  # Max 20 points for experience
                if skills_count > 0:
                    match_score += min(skills_count, 15)  # Max 15 points for skills
                
                # Cap at 100
                match_score = min(match_score, 100)
                
                ranked_candidates.append({
                    "name": name,
                    "email": email,
                    "ats_score": ats_score,
                    "match": int(match_score),
                    "career_level": career_level,
                    "years_experience": years_experience,
                    "skills_count": skills_count,
                    "resume_id": resume.get("id")
                })
                
            except Exception as e:
                print(f"⚠️ Error processing resume: {e}")
                continue
        
        # Sort by match score (descending)
        ranked_candidates.sort(key=lambda x: x["match"], reverse=True)
        
        print(f"✅ Successfully ranked {len(ranked_candidates)} candidates")
        return {"candidates": ranked_candidates}
    
    except Exception as e:
        print(f"❌ Error in process_and_match_resumes: {str(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing resumes: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)