"""
Generate high-fidelity fictional UPI fraud demonstration evidence files.
Creates:
1. UPI Payment Receipt (PhonePe style with UTR, amount, VPA, bank)
2. Phishing SMS Alert (Spoofed VK-POWERC electricity threat)
3. WhatsApp Chat Screenshot (Fake QR code advance payment scam)
"""

import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def create_demo_assets():
    base_dir = Path(__file__).resolve().parent.parent
    demo_dir = base_dir.parent / "demo_evidence"
    demo_dir.mkdir(parents=True, exist_ok=True)

    uploads_c101 = base_dir / "uploads" / "case_101"
    uploads_c101.mkdir(parents=True, exist_ok=True)

    uploads_c102 = base_dir / "uploads" / "case_102"
    uploads_c102.mkdir(parents=True, exist_ok=True)

    # -------------------------------------------------------------
    # 1. UPI Transaction Receipt (PhonePe Style)
    # -------------------------------------------------------------
    w, h = 600, 850
    img1 = Image.new("RGB", (w, h), color="#0f172a")  # Slate-900
    draw = ImageDraw.Draw(img1)

    # Header Card
    draw.rectangle([(20, 20), (580, 240)], fill="#5f259f", outline="#7c3aed", width=2)
    draw.text((40, 40), "PhonePe Payment Receipt", fill="#ffffff")
    draw.text((40, 80), "Transaction Successful", fill="#4ade80")
    draw.text((40, 130), "₹ 24,500.00", fill="#ffffff")
    draw.text((40, 190), "Paid to: rewards.claim77@ybl", fill="#e2e8f0")

    # Details Section Card
    draw.rectangle([(20, 260), (580, 780)], fill="#1e293b", outline="#334155", width=1)
    
    details = [
        ("Transfer Details", ""),
        ("Beneficiary Name:", "Electricity Power Clearances"),
        ("Beneficiary UPI ID:", "rewards.claim77@ybl"),
        ("Beneficiary Bank:", "YES BANK"),
        ("---", "---"),
        ("Debited From:", "Axis Bank A/C XX1234"),
        ("Sender UPI ID:", "victim.user@okaxis"),
        ("Sender Name:", "Vikramaditya Sharma"),
        ("---", "---"),
        ("UPI Ref No (UTR):", "412890563412"),
        ("Transaction Date:", "20 Nov 2026"),
        ("Transaction Time:", "09:14:32 PM"),
        ("Payment Mode:", "UPI - Instant Pay")
    ]

    y = 290
    for label, val in details:
        if label == "---":
            draw.line([(40, y + 10), (560, y + 10)], fill="#334155", width=1)
            y += 25
            continue
        if val == "":
            draw.text((40, y), label, fill="#facc15")  # Gold header
            y += 35
            continue
        draw.text((40, y), label, fill="#94a3b8")
        draw.text((250, y), val, fill="#ffffff" if "UTR" not in label else "#facc15")
        y += 32

    # Save receipt
    receipt_paths = [
        demo_dir / "1_upi_transaction_receipt.png",
        uploads_c101 / "ev_101_phonepe_receipt.png"
    ]
    for p in receipt_paths:
        img1.save(p)
    print(f"✓ Generated UPI Transaction Receipt: {receipt_paths[0]}")

    # -------------------------------------------------------------
    # 2. SMS Phishing Threat Screenshot (Spoofed VK-POWERC)
    # -------------------------------------------------------------
    w, h = 600, 700
    img2 = Image.new("RGB", (w, h), color="#090d16")  # Navy dark
    draw = ImageDraw.Draw(img2)

    # Top SMS app bar
    draw.rectangle([(0, 0), (600, 90)], fill="#111827")
    draw.text((40, 25), "Messages", fill="#94a3b8")
    draw.text((40, 50), "Sender: VK-POWERC (Spoofed Official Header)", fill="#ef4444")

    # SMS Bubble
    draw.rectangle([(30, 130), (570, 480)], fill="#1f2937", outline="#dc2626", width=2)
    draw.text((50, 150), "URGENT DISCONNECTION NOTICE", fill="#f87171")
    
    sms_lines = [
        "Dear Consumer,",
        "Your Electricity Power connection will be disconnected",
        "TONIGHT at 9:30 PM from the State Electricity Board",
        "office due to previous month unpaid bill of Rs 24,500.",
        "",
        "Please immediately clear the payment or call our official",
        "Helpline Officer at: +919876543210",
        "",
        "Or update via quick clearance APK portal:",
        "http://powerelectricity.apk/verify-bill",
        "",
        "Received: Today, 08:45 PM"
    ]
    y = 190
    for line in sms_lines:
        color = "#ef4444" if "9:30 PM" in line or "http" in line else "#e5e7eb"
        draw.text((50, y), line, fill=color)
        y += 24

    # Security Alert Tag
    draw.rectangle([(30, 520), (570, 640)], fill="#371010", outline="#ef4444", width=1)
    draw.text((50, 535), "AI Threat Intelligence Analysis:", fill="#fca5a5")
    draw.text((50, 565), "• Sender ID Spoofing detected: 'VK-POWERC'", fill="#fecaca")
    draw.text((50, 590), "• Urgency lure + Malicious APK download link detected", fill="#fecaca")

    sms_paths = [
        demo_dir / "2_sms_phishing_threat.png",
        uploads_c101 / "ev_102_sms_threat.png"
    ]
    for p in sms_paths:
        img2.save(p)
    print(f"✓ Generated SMS Phishing Screenshot: {sms_paths[0]}")

    # -------------------------------------------------------------
    # 3. WhatsApp Chat Screenshot (Fake QR Code Advance Scam)
    # -------------------------------------------------------------
    w, h = 600, 800
    img3 = Image.new("RGB", (w, h), color="#0b141a")  # WhatsApp dark
    draw = ImageDraw.Draw(img3)

    # WhatsApp Header Bar
    draw.rectangle([(0, 0), (600, 80)], fill="#202c33")
    draw.text((40, 20), "OLX Buyer (Rajesh Kumar)", fill="#e9edef")
    draw.text((40, 45), "+91 98765 12345 • Online", fill="#00a884")

    # Scammer Bubble 1
    draw.rectangle([(30, 110), (450, 200)], fill="#202c33", outline="#00a884", width=1)
    draw.text((45, 125), "Hello Sir, I am confirming purchase of your", fill="#d1d7db")
    draw.text((45, 145), "furniture set on OLX for Rs 15,000.", fill="#d1d7db")
    draw.text((45, 165), "Sending advance payment now.", fill="#d1d7db")

    # Scammer Bubble 2 with QR
    draw.rectangle([(30, 220), (520, 540)], fill="#202c33", outline="#f59e0b", width=2)
    draw.text((45, 235), "Please scan this QR to receive Rs 15,000:", fill="#facc15")
    
    # Fake QR Pattern box
    draw.rectangle([(60, 270), (280, 470)], fill="#ffffff")
    draw.rectangle([(80, 290), (130, 340)], fill="#000000")
    draw.rectangle([(210, 290), (260, 340)], fill="#000000")
    draw.rectangle([(80, 400), (130, 450)], fill="#000000")
    draw.rectangle([(160, 360), (190, 390)], fill="#000000")
    draw.text((90, 480), "SCAN TO RECEIVE ₹15,000", fill="#ef4444")

    draw.text((300, 320), "QR Amount:", fill="#8696a0")
    draw.text((300, 345), "₹ 15,000.00", fill="#4ade80")
    draw.text((300, 385), "Merchant VPA:", fill="#8696a0")
    draw.text((300, 405), "merchantpay.secure@okaxis", fill="#e9edef")

    # Scammer Bubble 3
    draw.rectangle([(30, 560), (550, 650)], fill="#202c33")
    draw.text((45, 575), "Open Google Pay or PhonePe, select 'Scan QR',", fill="#d1d7db")
    draw.text((45, 595), "and enter your UPI PIN to approve deposit of funds.", fill="#f87171")
    draw.text((45, 620), "Today, 04:15 PM", fill="#8696a0")

    # Security Warning Flag
    draw.rectangle([(30, 680), (570, 770)], fill="#2d1515", outline="#ef4444", width=1)
    draw.text((45, 695), "CRITICAL FRAUD PATTERN DETECTED:", fill="#ef4444")
    draw.text((45, 720), "• UPI PIN is NEVER required to receive money.", fill="#fca5a5")
    draw.text((45, 740), "• 'Scan to receive' QR is an unauthorized debit mandate.", fill="#fca5a5")

    wa_paths = [
        demo_dir / "3_whatsapp_conversation_qr_scam.png",
        uploads_c102 / "ev_103_olx_qr.jpg"
    ]
    for p in wa_paths:
        img3.save(p)
    print(f"✓ Generated WhatsApp Scam Screenshot: {wa_paths[0]}")


if __name__ == "__main__":
    create_demo_assets()
