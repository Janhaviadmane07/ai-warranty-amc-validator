"""
Risk assessment prediction module for Warranty & AMC claims.
Calculates risk score (0-100) and risk category based on claim indicators.
"""
import re
from datetime import datetime

def predict_risk(data: dict) -> dict:
    score = 15  # Base low risk
    factors = []
    
    issue = str(data.get('issue_description', '') or data.get('complaint', '')).lower()
    product_category = str(data.get('category', '')).lower()
    
    # Check for accidental or water damage indicators
    accidental_keywords = ['water', 'liquid', 'spill', 'dropped', 'fall', 'crack', 'cracked', 'physically damaged', 'broken screen', 'dent']
    found_accidental = [kw for kw in accidental_keywords if re.search(r'\b' + re.escape(kw) + r'\b', issue)]
    if found_accidental:
        score += 40
        factors.append(f"Physical/liquid damage keywords detected: {', '.join(found_accidental)}")
        
    # Check for unauthorized tampering or DIY keywords
    tamper_keywords = ['opened', 'third party', 'repaired myself', 'unofficial', 'unauthorized', 'jailbreak', 'rooted']
    found_tamper = [kw for kw in tamper_keywords if re.search(r'\b' + re.escape(kw) + r'\b', issue)]
    if found_tamper:
        score += 35
        factors.append(f"Possible tampering or non-authorized repair keywords: {', '.join(found_tamper)}")

    # Check for wear-and-tear
    wear_keywords = ['scratched', 'normal wear', 'cosmetic', 'faded', 'color fade', 'dust']
    found_wear = [kw for kw in wear_keywords if re.search(r'\b' + re.escape(kw) + r'\b', issue)]
    if found_wear:
        score += 20
        factors.append(f"Normal wear & tear keywords: {', '.join(found_wear)}")

    # Date-based risk calculation if warranty dates are passed
    warranty_end = data.get('warranty_end')
    if warranty_end:
        try:
            end_dt = datetime.strptime(str(warranty_end)[:10], '%Y-%m-%d')
            today = datetime.now()
            if today > end_dt:
                days_expired = (today - end_dt).days
                score += min(50, 20 + days_expired)
                factors.append(f"Warranty expired {days_expired} days ago")
            else:
                days_left = (end_dt - today).days
                if days_left < 7:
                    score += 15
                    factors.append("Claim filed in the last week of warranty")
        except Exception:
            pass

    # Normalize score between 0 and 100
    score = min(max(score, 5), 98)
    
    if score >= 70:
        category = "High Risk"
        recommendation = "Reject or Require Manual Inspection (High risk of non-coverage/accidental damage)"
    elif score >= 40:
        category = "Medium Risk"
        recommendation = "Agent Review Recommended (Additional proof of purchase or photos required)"
    else:
        category = "Low Risk"
        recommendation = "Eligible for Auto-Approval / Fast-track Warranty Claim"
        
    return {
        'risk_score': round(score, 1),
        'risk_category': category,
        'recommendation': recommendation,
        'risk_factors': factors
    }
