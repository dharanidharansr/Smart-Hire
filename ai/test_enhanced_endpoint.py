#!/usr/bin/env python3
"""
Test script to verify the enhanced resume processing endpoint
"""

import requests
import json
import os

def test_enhanced_resume_processing():
    """Test the enhanced resume processing endpoint"""
    try:
        # Test the endpoint
        url = "http://localhost:8000/enhanced-resume-processing"
        print(f"Testing enhanced endpoint: {url}")
        
        # Check if we have a test PDF file
        test_pdf_path = "test_resume.pdf"
        if not os.path.exists(test_pdf_path):
            print(f"❌ Test PDF file not found: {test_pdf_path}")
            print("Please place a test resume PDF file named 'test_resume.pdf' in the current directory")
            return False
        
        # Prepare the file upload
        with open(test_pdf_path, 'rb') as f:
            files = {'file': (test_pdf_path, f, 'application/pdf')}
            
            print(f"📄 Uploading test file: {test_pdf_path}")
            response = requests.post(url, files=files)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Enhanced endpoint working successfully!")
            print(f"📊 Extraction Summary:")
            if 'extraction_summary' in data:
                summary = data['extraction_summary']
                print(f"  - Personal info extracted: {summary.get('personal_info_extracted', False)}")
                print(f"  - Email found: {summary.get('email_found', False)}")
                print(f"  - Phone found: {summary.get('phone_found', False)}")
                print(f"  - Education entries: {summary.get('education_count', 0)}")
                print(f"  - Experience entries: {summary.get('experience_count', 0)}")
                print(f"  - Skills count: {summary.get('skills_count', 0)}")
                print(f"  - Projects count: {summary.get('projects_count', 0)}")
                print(f"  - ATS Score: {summary.get('ats_score', 0)}")
                print(f"  - Career Level: {summary.get('career_level', 'Unknown')}")
                print(f"  - Years Experience: {summary.get('years_experience', 0)}")
            
            print(f"💾 Database Info:")
            if 'database_info' in data:
                db_info = data['database_info']
                print(f"  - Saved to DB: {db_info.get('saved_to_db', False)}")
                print(f"  - Already exists: {db_info.get('already_exists', False)}")
                print(f"  - Resume ID: {db_info.get('resume_id', 'None')}")
            
            print(f"🔧 Processing Info:")
            if 'processing_info' in data:
                proc_info = data['processing_info']
                print(f"  - Method: {proc_info.get('processing_method', 'Unknown')}")
                print(f"  - AI Model: {proc_info.get('ai_model_used', 'Unknown')}")
            
            return True
        else:
            print(f"❌ Enhanced endpoint failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error testing enhanced endpoint: {e}")
        return False

if __name__ == "__main__":
    test_enhanced_resume_processing()
