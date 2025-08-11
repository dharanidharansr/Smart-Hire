#!/usr/bin/env python3
"""
Test script to verify the simplified process-and-match-resumes endpoint
"""

import requests
import json

def test_simple_process_and_match_resumes():
    """Test the simplified process-and-match-resumes endpoint"""
    try:
        # Test the endpoint
        url = "http://localhost:8000/process-and-match-resumes"
        print(f"Testing simplified endpoint: {url}")
        
        response = requests.get(url)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Simplified endpoint working successfully!")
            print(f"📊 Found {len(data.get('candidates', []))} candidates")
            
            if data.get('candidates'):
                print(f"🔍 Sample candidate data:")
                sample = data['candidates'][0]
                print(f"  - Name: {sample.get('name', 'Unknown')}")
                print(f"  - Email: {sample.get('email', 'No email')}")
                print(f"  - Match Score: {sample.get('match', 0)}")
                print(f"  - ATS Score: {sample.get('ats_score', 0)}")
                print(f"  - Career Level: {sample.get('career_level', 'Unknown')}")
                print(f"  - Years Experience: {sample.get('years_experience', 0)}")
                print(f"  - Skills Count: {sample.get('skills_count', 0)}")
            
            return True
        else:
            print(f"❌ Simplified endpoint failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error testing simplified endpoint: {e}")
        return False

if __name__ == "__main__":
    test_simple_process_and_match_resumes()
