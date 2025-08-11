"""
MongoDB client and database operations for ScreenSmart
Replaces Supabase functionality with MongoDB Atlas
"""

import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, DuplicateKeyError
import asyncio

logger = logging.getLogger(__name__)

class MongoDB:
    def __init__(self):
        self.client: Optional[AsyncIOMotorClient] = None
        self.database = None
        self.collections = {}
        
    async def connect(self):
        """Initialize MongoDB connection"""
        try:
            mongodb_uri = os.getenv("MONGODB_URI")
            database_name = os.getenv("MONGODB_DATABASE", "screensmart")
            
            if not mongodb_uri or mongodb_uri == "mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority":
                logger.warning("⚠️ MongoDB URI not configured - database operations will fail")
                return False
                
            # Create async client with better connection settings
            self.client = AsyncIOMotorClient(
                mongodb_uri,
                serverSelectionTimeoutMS=10000,  # Increased timeout
                connectTimeoutMS=10000,
                socketTimeoutMS=10000,
                heartbeatFrequencyMS=10000,
                retryWrites=True,
                w="majority"
            )
            
            # Test connection
            await self.client.admin.command('ping')
            
            self.database = self.client[database_name]
            
            # Initialize collections
            self.collections = {
                'candidates': self.database.candidates,
                'jobs': self.database.jobs,
                'applications': self.database.applications,
                'users': self.database.users,
                'profiles': self.database.profiles,
                'resumes': self.database.resumes,
                'extracted_resume_data': self.database.extracted_resume_data,
                'candidate_profiles': self.database.candidate_profiles,
                'companies': self.database.companies,
                'hr_users': self.database.hr_users,
                'hr_profiles': self.database.hr_profiles,
                'user_roles': self.database.user_roles,
                'auth_tokens': self.database.auth_tokens,
                'user_tokens': self.database.user_tokens
            }
            
            # Create indexes for better performance
            await self._create_indexes()
            
            logger.info("✅ MongoDB connection successful")
            return True
            
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}")
            return False
    
    async def _create_indexes(self):
        """Create database indexes for better performance"""
        try:
            # User-related indexes
            await self.collections['users'].create_index("email", unique=True)
            await self.collections['profiles'].create_index("user_id", unique=True)
            await self.collections['user_roles'].create_index("user_id", unique=True)
            await self.collections['user_tokens'].create_index("token", unique=True)
            await self.collections['user_tokens'].create_index("user_id")
            await self.collections['user_tokens'].create_index("expires_at")
            
            # Job-related indexes
            await self.collections['jobs'].create_index("created_by")
            await self.collections['jobs'].create_index("status")
            await self.collections['jobs'].create_index("created_at")
            
            # Application-related indexes
            await self.collections['applications'].create_index([("job_id", 1), ("candidate_id", 1)], unique=True)
            await self.collections['applications'].create_index("job_id")
            await self.collections['applications'].create_index("candidate_id")
            await self.collections['applications'].create_index("status")
            
            # Resume-related indexes
            await self.collections['resumes'].create_index("user_id")
            await self.collections['extracted_resume_data'].create_index("resume_id")
            await self.collections['candidates'].create_index("email")
            await self.collections['candidate_profiles'].create_index("user_id", unique=True)
            
            # Company and HR indexes
            await self.collections['hr_users'].create_index("user_id", unique=True)
            await self.collections['hr_users'].create_index("company_id")
            await self.collections['hr_profiles'].create_index("user_id", unique=True)
            
            # Authentication token indexes
            await self.collections['auth_tokens'].create_index("token", unique=True)
            await self.collections['auth_tokens'].create_index("user_id")
            await self.collections['auth_tokens'].create_index("expires_at")
            
            logger.info("✅ Database indexes created successfully")
            
        except Exception as e:
            logger.warning(f"⚠️ Index creation failed (may already exist): {e}")
    
    async def disconnect(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    def __getattr__(self, name):
        """Allow direct access to collections"""
        if name in self.collections:
            return self.collections[name]
        raise AttributeError(f"'{self.__class__.__name__}' object has no attribute '{name}'")

    # CRUD Operations
    
    async def insert_one(self, collection_name: str, document: Dict[str, Any]) -> Optional[str]:
        """Insert a single document"""
        try:
            if collection_name not in self.collections:
                raise ValueError(f"Collection {collection_name} not found")
                
            # Add timestamp if not present
            if 'created_at' not in document:
                document['created_at'] = datetime.utcnow()
                
            result = await self.collections[collection_name].insert_one(document)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Insert failed for {collection_name}: {e}")
            return None
    
    async def find_one(self, collection_name: str, filter_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find a single document"""
        try:
            if collection_name not in self.collections:
                raise ValueError(f"Collection {collection_name} not found")
                
            result = await self.collections[collection_name].find_one(filter_dict)
            if result:
                # Convert ObjectId to string for JSON serialization
                result['_id'] = str(result['_id'])
            return result
        except Exception as e:
            logger.error(f"Find one failed for {collection_name}: {e}")
            return None
    
    async def find_many(self, collection_name: str, filter_dict: Dict[str, Any] = {}, 
                       limit: Optional[int] = None, sort: Optional[List] = None) -> List[Dict[str, Any]]:
        """Find multiple documents"""
        try:
            if collection_name not in self.collections:
                raise ValueError(f"Collection {collection_name} not found")
                
            cursor = self.collections[collection_name].find(filter_dict)
            
            if sort:
                cursor = cursor.sort(sort)
                
            if limit:
                cursor = cursor.limit(limit)
                
            results = await cursor.to_list(length=None)
            
            # Convert ObjectId to string for JSON serialization
            for result in results:
                result['_id'] = str(result['_id'])
                
            return results
        except Exception as e:
            logger.error(f"Find many failed for {collection_name}: {e}")
            return []
    
    async def update_one(self, collection_name: str, filter_dict: Dict[str, Any], 
                        update_dict: Dict[str, Any]) -> bool:
        """Update a single document"""
        try:
            print(f"MongoDB update_one called for {collection_name}")
            print(f"Filter: {filter_dict}")
            print(f"Update: {update_dict}")
            
            if collection_name not in self.collections:
                raise ValueError(f"Collection {collection_name} not found")
            
            # If the update_dict doesn't contain MongoDB operators, wrap it in $set
            if not any(key.startswith('$') for key in update_dict.keys()):
                # Add updated_at timestamp if not already present
                if 'updated_at' not in update_dict:
                    update_dict['updated_at'] = datetime.utcnow()
                update_dict = {'$set': update_dict}
            else:
                # If it's already a MongoDB update operation, ensure updated_at is in $set
                if '$set' in update_dict and 'updated_at' not in update_dict['$set']:
                    update_dict['$set']['updated_at'] = datetime.utcnow()
            
            print(f"Final update operation: {update_dict}")
            
            result = await self.collections[collection_name].update_one(
                filter_dict, 
                update_dict
            )
            
            print(f"Update result: matched_count={result.matched_count}, modified_count={result.modified_count}")
            return result.modified_count > 0
        except Exception as e:
            print(f"Update failed for {collection_name}: {e}")
            logger.error(f"Update failed for {collection_name}: {e}")
            return False
    
    async def delete_one(self, collection_name: str, filter_dict: Dict[str, Any]) -> bool:
        """Delete a single document"""
        try:
            if collection_name not in self.collections:
                raise ValueError(f"Collection {collection_name} not found")
                
            result = await self.collections[collection_name].delete_one(filter_dict)
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Delete failed for {collection_name}: {e}")
            return False
    
    async def delete_many(self, collection_name: str, filter_dict: Dict[str, Any]) -> int:
        """Delete multiple documents"""
        try:
            if collection_name not in self.collections:
                raise ValueError(f"Collection {collection_name} not found")
                
            result = await self.collections[collection_name].delete_many(filter_dict)
            return result.deleted_count
        except Exception as e:
            logger.error(f"Delete many failed for {collection_name}: {e}")
            return 0
    
    async def upsert_one(self, collection_name: str, filter_dict: Dict[str, Any], 
                        document: Dict[str, Any]) -> Optional[str]:
        """Insert or update a document"""
        try:
            if collection_name not in self.collections:
                raise ValueError(f"Collection {collection_name} not found")
                
            # Add timestamps
            if 'created_at' not in document:
                document['created_at'] = datetime.utcnow()
            document['updated_at'] = datetime.utcnow()
            
            result = await self.collections[collection_name].replace_one(
                filter_dict, 
                document, 
                upsert=True
            )
            
            if result.upserted_id:
                return str(result.upserted_id)
            else:
                # Find the document to get its ID
                doc = await self.find_one(collection_name, filter_dict)
                return doc['_id'] if doc else None
                
        except Exception as e:
            logger.error(f"Upsert failed for {collection_name}: {e}")
            return None
    
    async def count(self, collection_name: str, filter_dict: Dict[str, Any] = {}) -> int:
        """Count documents"""
        try:
            if collection_name not in self.collections:
                raise ValueError(f"Collection {collection_name} not found")
                
            return await self.collections[collection_name].count_documents(filter_dict)
        except Exception as e:
            logger.error(f"Count failed for {collection_name}: {e}")
            return 0
    
    # Authentication and User Management (replaces Supabase Auth)
    
    async def create_user(self, email: str, password_hash: str, user_data: Dict[str, Any]) -> Optional[str]:
        """Create a new user (replaces supabase.auth.sign_up)"""
        try:
            user_doc = {
                'email': email,
                'password_hash': password_hash,
                'email_confirmed': True,  # Skip email confirmation for now
                'created_at': datetime.utcnow(),
                **user_data
            }
            
            user_id = await self.insert_one('users', user_doc)
            
            if user_id:
                # Create profile
                profile_data = {
                    'user_id': user_id,
                    'email': email,
                    'created_at': datetime.utcnow()
                }
                profile_data.update(user_data)
                await self.insert_one('profiles', profile_data)
                
            return user_id
        except DuplicateKeyError:
            logger.error(f"User with email {email} already exists")
            return None
        except Exception as e:
            logger.error(f"User creation failed: {e}")
            return None
    
    async def authenticate_user(self, email: str, password_hash: str) -> Optional[Dict[str, Any]]:
        """Authenticate user (replaces supabase.auth.sign_in)"""
        try:
            user = await self.find_one('users', {'email': email, 'password_hash': password_hash})
            return user
        except Exception as e:
            logger.error(f"Authentication failed: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID (replaces supabase.auth.get_user)"""
        try:
            from bson import ObjectId
            user = await self.find_one('users', {'_id': ObjectId(user_id)})
            return user
        except Exception as e:
            logger.error(f"Get user by ID failed: {e}")
            return None

# Global MongoDB instance
mongodb = MongoDB()

async def init_database():
    """Initialize database connection"""
    success = await mongodb.connect()
    return success

async def close_database():
    """Close database connection"""
    await mongodb.disconnect()

# Convenience functions for backward compatibility

async def get_db():
    """Get database instance"""
    return mongodb

def get_sync_client():
    """Get synchronous MongoDB client for non-async operations"""
    mongodb_uri = os.getenv("MONGODB_URI")
    if not mongodb_uri or mongodb_uri == "mongodb+srv://<username>:<password>@<cluster-url>/<database>?retryWrites=true&w=majority":
        return None
    
    try:
        client = MongoClient(
            mongodb_uri,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
            heartbeatFrequencyMS=10000,
            retryWrites=True,
            w="majority"
        )
        client.admin.command('ping')  # Test connection
        return client
    except Exception as e:
        logger.error(f"Sync MongoDB connection failed: {e}")
        return None
