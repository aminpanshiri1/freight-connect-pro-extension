from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Load(BaseModel):
    model_config = ConfigDict(extra="ignore")
    load_id: str = Field(default_factory=lambda: f"load_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    origin_city: str
    origin_state: str
    destination_city: str
    destination_state: str
    miles: int
    rate: float
    rpm: float
    weight: int
    equipment_type: str  # Van, Reefer, Flatbed
    broker_name: str
    broker_email: str
    broker_phone: str
    broker_mc: str
    pickup_date: str
    delivery_date: str
    deadhead_miles: int = 0
    is_pinned: bool = False
    is_contacted: bool = False
    scam_risk: str = "low"  # low, medium, high
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoadCreate(BaseModel):
    origin_city: str
    origin_state: str
    destination_city: str
    destination_state: str
    miles: int
    rate: float
    weight: int
    equipment_type: str
    broker_name: str
    broker_email: str
    broker_phone: str
    broker_mc: str
    pickup_date: str
    delivery_date: str
    deadhead_miles: int = 0

class EmailTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    template_id: str = Field(default_factory=lambda: f"tpl_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    subject: str
    body: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmailTemplateCreate(BaseModel):
    name: str
    subject: str
    body: str

class BrokerCheck(BaseModel):
    mc_number: str
    company_name: str
    is_active: bool
    safety_rating: str
    scam_reports: int
    factoring_rating: str
    days_in_business: int

class RPMCalculation(BaseModel):
    rate: float
    miles: int
    deadhead_miles: int = 0
    fuel_cost_per_gallon: float = 3.50
    mpg: float = 6.5
    tolls: float = 0

class SavedSearch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    search_id: str = Field(default_factory=lambda: f"search_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    origin_states: List[str] = []
    destination_states: List[str] = []
    min_rate: float = 0
    min_rpm: float = 0
    equipment_types: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserPreferences(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    auto_refresh: bool = True
    refresh_interval: int = 30  # seconds
    default_equipment: str = "Van"
    ignored_brokers: List[str] = []
    ignored_states: List[str] = []
    min_rpm_alert: float = 2.0
    email_signature: str = ""

# ==================== AUTH HELPERS ====================

async def get_session_from_cookie(request: Request) -> Optional[str]:
    """Get session token from cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    return session_token

async def get_current_user(request: Request) -> User:
    """Validate session and return current user"""
    session_token = await get_session_from_cookie(request)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

async def get_optional_user(request: Request) -> Optional[User]:
    """Get current user if authenticated, None otherwise"""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    """Exchange session_id for session_token and set cookie"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Exchange session_id with Emergent Auth
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        user_data = auth_response.json()
    
    # Check if user exists
    existing_user = await db.users.find_one(
        {"email": user_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = {
            "user_id": user_id,
            "email": user_data["email"],
            "name": user_data["name"],
            "picture": user_data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
        
        # Create default preferences
        default_prefs = {
            "user_id": user_id,
            "auto_refresh": True,
            "refresh_interval": 30,
            "default_equipment": "Van",
            "ignored_brokers": [],
            "ignored_states": [],
            "min_rpm_alert": 2.0,
            "email_signature": ""
        }
        await db.user_preferences.insert_one(default_prefs)
    
    # Create session
    session_token = user_data.get("session_token", f"sess_{uuid.uuid4().hex}")
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    # Get user for response
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current authenticated user"""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = await get_session_from_cookie(request)
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== LOAD ROUTES ====================

@api_router.get("/loads", response_model=List[dict])
async def get_loads(
    equipment: Optional[str] = None,
    origin_state: Optional[str] = None,
    destination_state: Optional[str] = None,
    min_rpm: Optional[float] = None,
    user: Optional[User] = Depends(get_optional_user)
):
    """Get loads with optional filters"""
    query = {}
    if equipment:
        query["equipment_type"] = equipment
    if origin_state:
        query["origin_state"] = origin_state
    if destination_state:
        query["destination_state"] = destination_state
    if min_rpm:
        query["rpm"] = {"$gte": min_rpm}
    
    loads = await db.loads.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Convert datetime strings back
    for load in loads:
        if isinstance(load.get('created_at'), str):
            load['created_at'] = datetime.fromisoformat(load['created_at'])
    
    return loads

@api_router.post("/loads", response_model=dict)
async def create_load(load_data: LoadCreate, user: User = Depends(get_current_user)):
    """Create a new load"""
    rpm = load_data.rate / load_data.miles if load_data.miles > 0 else 0
    
    load = Load(
        user_id=user.user_id,
        rpm=round(rpm, 2),
        **load_data.model_dump()
    )
    
    doc = load.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.loads.insert_one(doc)
    return doc

@api_router.patch("/loads/{load_id}/pin")
async def toggle_pin_load(load_id: str, user: User = Depends(get_current_user)):
    """Toggle pin status of a load"""
    load = await db.loads.find_one({"load_id": load_id}, {"_id": 0})
    if not load:
        raise HTTPException(status_code=404, detail="Load not found")
    
    new_pin_status = not load.get("is_pinned", False)
    await db.loads.update_one(
        {"load_id": load_id},
        {"$set": {"is_pinned": new_pin_status}}
    )
    return {"load_id": load_id, "is_pinned": new_pin_status}

@api_router.patch("/loads/{load_id}/contacted")
async def mark_load_contacted(load_id: str, user: User = Depends(get_current_user)):
    """Mark a load as contacted"""
    await db.loads.update_one(
        {"load_id": load_id},
        {"$set": {"is_contacted": True}}
    )
    return {"load_id": load_id, "is_contacted": True}

# ==================== BROKER CHECK ROUTES ====================

@api_router.get("/broker/check/{mc_number}")
async def check_broker(mc_number: str):
    """Check broker safety and scam risk (simulated FMCSA check)"""
    # Simulated broker check - in production would call FMCSA API
    import random
    
    # Check if we have cached broker data
    cached = await db.broker_checks.find_one({"mc_number": mc_number}, {"_id": 0})
    if cached:
        return cached
    
    # Simulate FMCSA data
    safety_ratings = ["Satisfactory", "Conditional", "Unsatisfactory", "Not Rated"]
    factoring_ratings = ["Excellent", "Good", "Fair", "Poor", "Unknown"]
    
    broker_data = {
        "mc_number": mc_number,
        "company_name": f"Transport Co {mc_number[-4:]}",
        "is_active": random.random() > 0.1,
        "safety_rating": random.choice(safety_ratings),
        "scam_reports": random.randint(0, 5),
        "factoring_rating": random.choice(factoring_ratings),
        "days_in_business": random.randint(30, 3650),
        "checked_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Determine risk level
    risk = "low"
    if broker_data["scam_reports"] > 2 or broker_data["safety_rating"] == "Unsatisfactory":
        risk = "high"
    elif broker_data["scam_reports"] > 0 or broker_data["days_in_business"] < 180:
        risk = "medium"
    
    broker_data["risk_level"] = risk
    
    # Cache the result
    await db.broker_checks.insert_one(broker_data)
    
    return broker_data

# ==================== RPM CALCULATOR ====================

@api_router.post("/calculate/rpm")
async def calculate_rpm(calc: RPMCalculation):
    """Calculate RPM with detailed breakdown"""
    total_miles = calc.miles + calc.deadhead_miles
    
    # Gross RPM
    gross_rpm = calc.rate / calc.miles if calc.miles > 0 else 0
    
    # Net RPM (after fuel)
    fuel_cost = (total_miles / calc.mpg) * calc.fuel_cost_per_gallon
    net_profit = calc.rate - fuel_cost - calc.tolls
    net_rpm = net_profit / calc.miles if calc.miles > 0 else 0
    
    # RPM+ (including deadhead)
    rpm_plus = calc.rate / total_miles if total_miles > 0 else 0
    
    return {
        "gross_rpm": round(gross_rpm, 2),
        "net_rpm": round(net_rpm, 2),
        "rpm_plus": round(rpm_plus, 2),
        "fuel_cost": round(fuel_cost, 2),
        "net_profit": round(net_profit, 2),
        "total_miles": total_miles
    }

@api_router.post("/calculate/toll")
async def estimate_toll(origin: str, destination: str, equipment: str = "Van"):
    """Estimate toll costs for a route (simplified estimation)"""
    # Simplified toll estimation based on common toll roads
    # In production, would use actual toll API
    import random
    
    base_toll = random.uniform(20, 150)
    if equipment == "Flatbed":
        base_toll *= 1.2
    
    return {
        "origin": origin,
        "destination": destination,
        "estimated_toll": round(base_toll, 2),
        "note": "Estimate only. Actual tolls may vary."
    }

# ==================== EMAIL TEMPLATES ====================

@api_router.get("/templates", response_model=List[dict])
async def get_templates(user: User = Depends(get_current_user)):
    """Get user's email templates"""
    templates = await db.email_templates.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(50)
    return templates

@api_router.post("/templates", response_model=dict)
async def create_template(template_data: EmailTemplateCreate, user: User = Depends(get_current_user)):
    """Create an email template"""
    template = EmailTemplate(
        user_id=user.user_id,
        **template_data.model_dump()
    )
    
    doc = template.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.email_templates.insert_one(doc)
    return doc

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user: User = Depends(get_current_user)):
    """Delete an email template"""
    result = await db.email_templates.delete_one({
        "template_id": template_id,
        "user_id": user.user_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# ==================== SAVED SEARCHES ====================

@api_router.get("/searches", response_model=List[dict])
async def get_saved_searches(user: User = Depends(get_current_user)):
    """Get user's saved searches"""
    searches = await db.saved_searches.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(20)
    return searches

@api_router.post("/searches", response_model=dict)
async def create_saved_search(
    name: str,
    origin_states: List[str] = [],
    destination_states: List[str] = [],
    min_rate: float = 0,
    min_rpm: float = 0,
    equipment_types: List[str] = [],
    user: User = Depends(get_current_user)
):
    """Create a saved search"""
    search = SavedSearch(
        user_id=user.user_id,
        name=name,
        origin_states=origin_states,
        destination_states=destination_states,
        min_rate=min_rate,
        min_rpm=min_rpm,
        equipment_types=equipment_types
    )
    
    doc = search.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.saved_searches.insert_one(doc)
    return doc

# ==================== USER PREFERENCES ====================

@api_router.get("/preferences")
async def get_preferences(user: User = Depends(get_current_user)):
    """Get user preferences"""
    prefs = await db.user_preferences.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    if not prefs:
        # Create default preferences
        prefs = {
            "user_id": user.user_id,
            "auto_refresh": True,
            "refresh_interval": 30,
            "default_equipment": "Van",
            "ignored_brokers": [],
            "ignored_states": [],
            "min_rpm_alert": 2.0,
            "email_signature": ""
        }
        await db.user_preferences.insert_one(prefs)
    return prefs

@api_router.patch("/preferences")
async def update_preferences(request: Request, user: User = Depends(get_current_user)):
    """Update user preferences"""
    body = await request.json()
    
    # Remove any _id if present
    body.pop("_id", None)
    body.pop("user_id", None)
    
    await db.user_preferences.update_one(
        {"user_id": user.user_id},
        {"$set": body},
        upsert=True
    )
    
    updated = await db.user_preferences.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    return updated

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    """Seed sample load data for testing"""
    sample_loads = [
        {
            "load_id": f"load_{uuid.uuid4().hex[:12]}",
            "origin_city": "Chicago", "origin_state": "IL",
            "destination_city": "Dallas", "destination_state": "TX",
            "miles": 920, "rate": 2300, "rpm": 2.50, "weight": 42000,
            "equipment_type": "Van", "broker_name": "Swift Logistics",
            "broker_email": "dispatch@swiftlog.com", "broker_phone": "800-555-0101",
            "broker_mc": "MC123456", "pickup_date": "2026-01-24", "delivery_date": "2026-01-26",
            "deadhead_miles": 45, "is_pinned": False, "is_contacted": False,
            "scam_risk": "low", "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "load_id": f"load_{uuid.uuid4().hex[:12]}",
            "origin_city": "Atlanta", "origin_state": "GA",
            "destination_city": "Miami", "destination_state": "FL",
            "miles": 662, "rate": 1800, "rpm": 2.72, "weight": 38000,
            "equipment_type": "Reefer", "broker_name": "Cool Freight",
            "broker_email": "loads@coolfreight.com", "broker_phone": "800-555-0102",
            "broker_mc": "MC234567", "pickup_date": "2026-01-23", "delivery_date": "2026-01-24",
            "deadhead_miles": 30, "is_pinned": False, "is_contacted": False,
            "scam_risk": "low", "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "load_id": f"load_{uuid.uuid4().hex[:12]}",
            "origin_city": "Los Angeles", "origin_state": "CA",
            "destination_city": "Phoenix", "destination_state": "AZ",
            "miles": 373, "rate": 950, "rpm": 2.55, "weight": 35000,
            "equipment_type": "Flatbed", "broker_name": "Desert Haul",
            "broker_email": "booking@deserthaul.com", "broker_phone": "800-555-0103",
            "broker_mc": "MC345678", "pickup_date": "2026-01-25", "delivery_date": "2026-01-25",
            "deadhead_miles": 15, "is_pinned": False, "is_contacted": False,
            "scam_risk": "medium", "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "load_id": f"load_{uuid.uuid4().hex[:12]}",
            "origin_city": "Denver", "origin_state": "CO",
            "destination_city": "Kansas City", "destination_state": "MO",
            "miles": 604, "rate": 1450, "rpm": 2.40, "weight": 44000,
            "equipment_type": "Van", "broker_name": "Midwest Express",
            "broker_email": "dispatch@mwexpress.com", "broker_phone": "800-555-0104",
            "broker_mc": "MC456789", "pickup_date": "2026-01-24", "delivery_date": "2026-01-25",
            "deadhead_miles": 60, "is_pinned": True, "is_contacted": False,
            "scam_risk": "low", "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "load_id": f"load_{uuid.uuid4().hex[:12]}",
            "origin_city": "Seattle", "origin_state": "WA",
            "destination_city": "Portland", "destination_state": "OR",
            "miles": 175, "rate": 520, "rpm": 2.97, "weight": 28000,
            "equipment_type": "Van", "broker_name": "Pacific Freight",
            "broker_email": "loads@pacfreight.com", "broker_phone": "800-555-0105",
            "broker_mc": "MC567890", "pickup_date": "2026-01-23", "delivery_date": "2026-01-23",
            "deadhead_miles": 10, "is_pinned": False, "is_contacted": True,
            "scam_risk": "low", "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "load_id": f"load_{uuid.uuid4().hex[:12]}",
            "origin_city": "Houston", "origin_state": "TX",
            "destination_city": "New Orleans", "destination_state": "LA",
            "miles": 348, "rate": 875, "rpm": 2.51, "weight": 40000,
            "equipment_type": "Reefer", "broker_name": "Gulf Coast Logistics",
            "broker_email": "dispatch@gulfcoast.com", "broker_phone": "800-555-0106",
            "broker_mc": "MC678901", "pickup_date": "2026-01-26", "delivery_date": "2026-01-26",
            "deadhead_miles": 25, "is_pinned": False, "is_contacted": False,
            "scam_risk": "high", "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Clear existing and insert new
    await db.loads.delete_many({})
    await db.loads.insert_many(sample_loads)
    
    return {"message": f"Seeded {len(sample_loads)} loads"}

# Include router and setup middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
