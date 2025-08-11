#!/usr/bin/env python3
"""
Check if all required dependencies are available
"""

def check_dependencies():
    """Check if all required dependencies are available"""
    missing_deps = []
    
    try:
        import fastapi
        print("✅ FastAPI available")
    except ImportError:
        missing_deps.append("fastapi")
        print("❌ FastAPI not available")
    
    try:
        import spacy
        print("✅ spaCy available")
    except ImportError:
        missing_deps.append("spacy")
        print("❌ spaCy not available")
    
    try:
        import sentence_transformers
        print("✅ sentence-transformers available")
    except ImportError:
        missing_deps.append("sentence-transformers")
        print("❌ sentence-transformers not available")
    
    try:
        import sklearn
        print("✅ scikit-learn available")
    except ImportError:
        missing_deps.append("scikit-learn")
        print("❌ scikit-learn not available")
    
    try:
        import pandas
        print("✅ pandas available")
    except ImportError:
        missing_deps.append("pandas")
        print("❌ pandas not available")
    
    try:
        import numpy
        print("✅ numpy available")
    except ImportError:
        missing_deps.append("numpy")
        print("❌ numpy not available")
    
    try:
        import groq
        print("✅ groq available")
    except ImportError:
        missing_deps.append("groq")
        print("❌ groq not available")
    
    try:
        import pymongo
        print("✅ pymongo available")
    except ImportError:
        missing_deps.append("pymongo")
        print("❌ pymongo not available")
    
    try:
        import motor
        print("✅ motor available")
    except ImportError:
        missing_deps.append("motor")
        print("❌ motor not available")
    
    if missing_deps:
        print(f"\n❌ Missing dependencies: {', '.join(missing_deps)}")
        print("Please install missing dependencies with: pip install -r requirements.txt")
        return False
    else:
        print("\n✅ All dependencies available!")
        return True

if __name__ == "__main__":
    check_dependencies()
