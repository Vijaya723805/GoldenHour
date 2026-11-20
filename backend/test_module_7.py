"""
GoldenHour - Module 7 Test Suite
Tests Emergency Response, 3-Stage Checklist, Case Tracking, Timeline,
Reference Numbers, Follow-up Notes, Official Links, and Emergency Dashboard.
"""

import sys
from pathlib import Path
from datetime import datetime

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from app.schemas.case_tracking import (
    ActionStage,
    TrackingStatus,
    AddNoteRequest,
    UpdateReferenceNumbersRequest,
    UpdateTrackingStatusRequest,
    ToggleChecklistItemRequest
)
from app.services.case_tracking_service import case_tracking_service, DEFAULT_OFFICIAL_LINKS
from app.services.dashboard_service import dashboard_service
from app.schemas.dashboard import CreateCaseRequest


def run_tests():
    print("=" * 80)
    print("🛡️  GOLDENHOUR MODULE 7 TEST SUITE: EMERGENCY RESPONSE & CASE TRACKING")
    print("=" * 80)

    # -------------------------------------------------------------------------
    # TEST 1: Retrieve Case Tracking for Pre-seeded Demo Case 101
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Retrieving tracking details for Demo Case 101...")
    track_101 = case_tracking_service.get_case_tracking("case_101", "user_demo_772")
    assert track_101 is not None, "Tracking details should exist"
    assert track_101.case_number == "GH-2024-8912", f"Expected GH-2024-8912, got {track_101.case_number}"
    assert track_101.amount_lost == 24500.0, f"Expected 24500.0, got {track_101.amount_lost}"
    assert track_101.golden_hour_active is True, "Case 101 should have Golden Hour active"
    print(f"  ✓ Case Number: {track_101.case_number}")
    print(f"  ✓ Current Status: {track_101.current_status.value}")
    print(f"  ✓ Amount Lost: ₹{track_101.amount_lost}")
    print(f"  ✓ 12-Digit UTR: {track_101.transaction_id_utr}")

    # -------------------------------------------------------------------------
    # TEST 2: Validate 3-Stage Emergency Checklist
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Validating 3-Stage Emergency Checklist structure & prescribed contents...")
    checklist = track_101.checklist_items
    assert len(checklist) == 12, f"Expected exactly 12 checklist items, got {len(checklist)}"

    # Group by stage
    stage_10m = [item for item in checklist if item.stage == ActionStage.WITHIN_10_MINUTES]
    stage_1h = [item for item in checklist if item.stage == ActionStage.WITHIN_1_HOUR]
    stage_24h = [item for item in checklist if item.stage == ActionStage.WITHIN_24_HOURS]

    assert len(stage_10m) == 4, f"Expected 4 items in 10-Minute stage, got {len(stage_10m)}"
    assert len(stage_1h) == 4, f"Expected 4 items in 1-Hour stage, got {len(stage_1h)}"
    assert len(stage_24h) == 4, f"Expected 4 items in 24-Hour stage, got {len(stage_24h)}"

    # Verify Stage 1 items
    stage_10m_titles = [i.title for i in stage_10m]
    assert any("1930" in t for t in stage_10m_titles), "Stage 1 must include helpline 1930"
    assert any("bank through its official channels" in t for t in stage_10m_titles), "Stage 1 must include informing bank"
    assert any("Preserve transaction receipts" in t for t in stage_10m_titles), "Stage 1 must include evidence preservation"
    assert any("Follow official instructions" in t for t in stage_10m_titles), "Stage 1 must include following instructions"
    print("  ✓ Stage 1 (Within 10 Minutes): 4 items validated")

    # Verify Stage 2 items
    stage_1h_titles = [i.title for i in stage_1h]
    assert any("reporting process" in t for t in stage_1h_titles), "Stage 2 must include reporting process"
    assert any("official cybercrime portal" in t for t in stage_1h_titles), "Stage 2 must include cybercrime portal"
    assert any("Share evidence with the bank" in t for t in stage_1h_titles), "Stage 2 must include sharing evidence with bank"
    assert any("Save acknowledgement and reference numbers" in t for t in stage_1h_titles), "Stage 2 must include saving reference numbers"
    print("  ✓ Stage 2 (Within 1 Hour): 4 items validated")

    # Verify Stage 3 items
    stage_24h_titles = [i.title for i in stage_24h]
    assert any("Follow up with the bank" in t for t in stage_24h_titles), "Stage 3 must include following up with bank"
    assert any("Keep complaint acknowledgement details" in t for t in stage_24h_titles), "Stage 3 must include keeping acknowledgement details"
    assert any("Check complaint status through official channels" in t for t in stage_24h_titles), "Stage 3 must include checking status"
    assert any("Preserve all additional evidence" in t for t in stage_24h_titles), "Stage 3 must include preserving additional evidence"
    print("  ✓ Stage 3 (Within 24 Hours): 4 items validated")

    # -------------------------------------------------------------------------
    # TEST 3: Toggle Checklist Item & Verify Timeline Audit Trail
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Toggling checklist items and checking timeline event emission...")
    initial_events_count = len(track_101.timeline)
    
    # Toggle item 'chk_10m_instructions' to True
    updated_track = case_tracking_service.toggle_checklist_item(
        "case_101", "user_demo_772", "chk_10m_instructions", True
    )
    target_item = next(i for i in updated_track.checklist_items if i.id == "chk_10m_instructions")
    assert target_item.is_completed is True, "Item should now be completed"
    assert target_item.completed_at is not None, "Completed timestamp should be recorded"
    assert len(updated_track.timeline) == initial_events_count + 1, "Timeline event should have been added"
    latest_event = updated_track.timeline[0]
    assert "Checklist Action: Completed" in latest_event.title, f"Expected event title, got {latest_event.title}"
    print(f"  ✓ Toggled 'chk_10m_instructions' -> Completed. Event: '{latest_event.title}'")

    # -------------------------------------------------------------------------
    # TEST 4: Manual Reference Numbers Logging & Submission Confirmation
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Updating official complaint reference numbers...")
    updated_track = case_tracking_service.update_reference_numbers(
        case_id="case_101",
        victim_id="user_demo_772",
        ncrp_token="2024/NCRP/994411",
        bank_sr_number="SBI-DISPUTE-892144",
        police_ref="Cyber PS Diary Entry 102/2024",
        confirm_ncrp_submitted=True,
        confirm_bank_submitted=True
    )
    assert updated_track.ncrp_acknowledgement_token == "2024/NCRP/994411"
    assert updated_track.ncrp_submission_confirmed is True
    assert updated_track.bank_dispute_sr_number == "SBI-DISPUTE-892144"
    assert updated_track.bank_submission_confirmed is True
    assert updated_track.police_station_ref == "Cyber PS Diary Entry 102/2024"
    assert updated_track.submission_confirmed_at is not None

    ref_event = updated_track.timeline[0]
    assert ref_event.event_type == "REFERENCE_LOGGED", f"Expected REFERENCE_LOGGED, got {ref_event.event_type}"
    print(f"  ✓ Saved NCRP Token: {updated_track.ncrp_acknowledgement_token}")
    print(f"  ✓ Saved Bank SR: {updated_track.bank_dispute_sr_number}")
    print(f"  ✓ Recorded Submission Confirmation at: {updated_track.submission_confirmed_at}")

    # -------------------------------------------------------------------------
    # TEST 5: Update Follow-up Status & Log Follow-up Note
    # -------------------------------------------------------------------------
    print("\n[TEST 5] Updating follow-up status and adding complainant follow-up notes...")
    status_track = case_tracking_service.update_tracking_status(
        case_id="case_101",
        victim_id="user_demo_772",
        new_status=TrackingStatus.UNDER_BANK_INVESTIGATION,
        note="SBI Cyber Desk manager requested 48 business hours to process lien request."
    )
    assert status_track.current_status == TrackingStatus.UNDER_BANK_INVESTIGATION

    # Add follow-up note
    note_track = case_tracking_service.add_follow_up_note(
        case_id="case_101",
        victim_id="user_demo_772",
        note_text="Visited SBI branch. Handed over printed Freeze Requisition and NCRP receipt. Chief Manager signed acknowledgement copy.",
        category="Branch Manager Visit"
    )
    assert len(note_track.follow_up_notes) > 0
    latest_note = note_track.follow_up_notes[0]
    assert latest_note.category == "Branch Manager Visit"
    assert "Chief Manager signed acknowledgement copy" in latest_note.note_text
    print(f"  ✓ Updated Status: {status_track.current_status.value}")
    print(f"  ✓ Logged Note [{latest_note.category}]: {latest_note.note_text[:65]}...")

    # -------------------------------------------------------------------------
    # TEST 6: Emergency Dashboard Data Endpoint
    # -------------------------------------------------------------------------
    print("\n[TEST 6] Validating Emergency Dashboard compilation...")
    dash_data = case_tracking_service.get_emergency_dashboard("case_101", "user_demo_772")
    assert dash_data.case_number == "GH-2024-8912"
    assert dash_data.current_status == TrackingStatus.UNDER_BANK_INVESTIGATION
    assert len(dash_data.important_next_actions) > 0, "Should have computed priority next actions"
    assert len(dash_data.ready_documents) == 4, f"Expected 4 ready documents, got {len(dash_data.ready_documents)}"
    assert dash_data.follow_up_info is not None
    assert dash_data.follow_up_info.cybercrime_helpline == "1930"
    assert dash_data.follow_up_info.cybercrime_portal_url == "https://cybercrime.gov.in/"

    # Check 4 documents
    doc_types = [d.doc_type for d in dash_data.ready_documents]
    assert "BANK_FRAUD_COMPLAINT" in doc_types
    assert "BANK_FREEZE_REQUEST" in doc_types
    assert "HELPLINE_1930_SCRIPT" in doc_types
    assert "CYBERCRIME_PORTAL_DRAFT" in doc_types
    print(f"  ✓ Emergency Dashboard Completion: {dash_data.completion_percentage}%")
    print(f"  ✓ Important Next Actions Count: {len(dash_data.important_next_actions)}")
    print(f"  ✓ Ready Documents Verified: {', '.join(doc_types)}")

    # -------------------------------------------------------------------------
    # TEST 7: Verified Official Reporting Links
    # -------------------------------------------------------------------------
    print("\n[TEST 7] Verifying official reporting links...")
    links = DEFAULT_OFFICIAL_LINKS
    assert len(links) >= 2, "Must contain at least NCRP portal and 1930 helpline"
    
    ncrp_link = next((l for l in links if "cybercrime.gov.in" in l.url), None)
    assert ncrp_link is not None, "National Cybercrime Reporting Portal must be listed"
    assert ncrp_link.url == "https://cybercrime.gov.in/"
    assert ncrp_link.verified is True

    helpline_link = next((l for l in links if l.helpline_number == "1930"), None)
    assert helpline_link is not None, "Helpline 1930 must be listed"
    assert helpline_link.url == "tel:1930"
    assert helpline_link.verified is True
    print(f"  ✓ Verified Portal: {ncrp_link.name} ({ncrp_link.url})")
    print(f"  ✓ Verified Helpline: {helpline_link.name} ({helpline_link.helpline_number})")

    # -------------------------------------------------------------------------
    # TEST 8: Full End-to-End Workflow with a Brand New Fictional Case
    # -------------------------------------------------------------------------
    print("\n[TEST 8] Creating a brand-new fictional fraud case and tracking lifecycle...")
    new_case_req = CreateCaseRequest(
        title="Unauthorized Google Pay Transfer via Fake Courier Delivery SMS",
        fraud_category="PHISHING_PAYMENT_LINK",
        fraud_description="Victim clicked SMS link claiming parcel pending fee of ₹5, but ₹38,000 debited from ICICI account.",
        amount_lost=38000.0,
        transaction_id_utr="413998822109",
        beneficiary_upi_id="fastdelivery.hub@icici",
        beneficiary_bank="ICICI Bank",
        contact_phone="+919876501234",
        contact_email="citizen.fictional@example.com"
    )
    new_case = dashboard_service.create_case("user_fictional_99", new_case_req)
    assert new_case.id is not None
    assert new_case.case_number.startswith("GH-")
    print(f"  ✓ Initialized Fictional Case: {new_case.case_number} (ID: {new_case.id})")

    # Retrieve Module 7 tracking for this new case
    new_tracking = case_tracking_service.get_case_tracking(new_case.id, "user_fictional_99")
    assert new_tracking.current_status == TrackingStatus.CASE_INITIALIZED
    assert len(new_tracking.checklist_items) == 12
    assert len(new_tracking.timeline) >= 1
    assert len(new_tracking.ready_documents) == 4

    # Step A: Victim calls 1930 and toggles first checklist item
    case_tracking_service.toggle_checklist_item(new_case.id, "user_fictional_99", "chk_10m_1930", True)
    
    # Step B: Victim logs official 1930 token
    case_tracking_service.update_reference_numbers(
        case_id=new_case.id,
        victim_id="user_fictional_99",
        ncrp_token="2024/NCRP/771029",
        confirm_ncrp_submitted=True
    )

    # Step C: Victim updates status to REPORTED_TO_1930
    case_tracking_service.update_tracking_status(
        case_id=new_case.id,
        victim_id="user_fictional_99",
        new_status=TrackingStatus.REPORTED_TO_1930,
        note="1930 operator confirmed intake. Case forwarded to ICICI nodal fraud desk."
    )

    # Verify final state
    final_tracking = case_tracking_service.get_case_tracking(new_case.id, "user_fictional_99")
    assert final_tracking.ncrp_acknowledgement_token == "2024/NCRP/771029"
    assert final_tracking.current_status == TrackingStatus.REPORTED_TO_1930
    assert len(final_tracking.timeline) >= 4
    print(f"  ✓ New Case Lifecycle Complete: Status = {final_tracking.current_status.value}")
    print(f"  ✓ NCRP Token: {final_tracking.ncrp_acknowledgement_token}")
    print(f"  ✓ Audit Timeline Events Logged: {len(final_tracking.timeline)}")

    # -------------------------------------------------------------------------
    # TEST 9: Compliance Rules Verification
    # -------------------------------------------------------------------------
    print("\n[TEST 9] Verifying strict compliance & legal disclaimer rules...")
    disclaimer = final_tracking.disclaimer
    assert "recommended response targets" in disclaimer.lower()
    assert "not guaranteed legal deadlines" in disclaimer.lower()
    assert "does not claim complaints have been submitted" in disclaimer.lower()
    assert "only banks and authorized authorities decide on freezing" in disclaimer.lower()
    print("  ✓ Strict zero-false-claim compliance disclaimers verified")

    print("\n" + "=" * 80)
    print("🎉 ALL 9 MODULE 7 INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)


if __name__ == "__main__":
    run_tests()
