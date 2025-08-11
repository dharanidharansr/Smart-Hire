#!/usr/bin/env python3
"""
Test script to verify the process-and-match-resumes endpoint
"""

import requests
import json

def test_process_and_match_resumes():
    """Test the process-and-match-resumes endpoint"""
    try:
        # Test the endpoint
        url = "http://localhost:8000/process-and-match-resumes"
        print(f"Testing endpoint: {url}")
        
        response = requests.get(url)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Endpoint working successfully!")
            print(f"Response: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Endpoint failed with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure the backend is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")
        return False

if __name__ == "__main__":
    test_process_and_match_resumes()
