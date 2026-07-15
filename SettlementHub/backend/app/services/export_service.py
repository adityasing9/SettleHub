import csv
from io import BytesIO, StringIO
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from typing import List, Dict, Any

def generate_csv_ledger(ledger_data: List[Dict[str, Any]]) -> str:
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Date", "Type", "Description", "Amount", "Currency", 
        "Exchange Rate", "Converted Amount (Base)", "Running Balance (Base)"
    ])
    for row in ledger_data:
        date_str = row["date"].strftime('%Y-%m-%d') if hasattr(row["date"], 'strftime') else str(row["date"])[:10]
        writer.writerow([
            date_str,
            row["type"],
            row["description"],
            row["amount"],
            row["currency"],
            row["exchange_rate"],
            row["converted_amount"],
            row["running_balance"]
        ])
    return output.getvalue()

def generate_excel_ledger(ledger_data: List[Dict[str, Any]]) -> BytesIO:
    rows = []
    for row in ledger_data:
        date_str = row["date"].strftime('%Y-%m-%d') if hasattr(row["date"], 'strftime') else str(row["date"])[:10]
        rows.append({
            "Date": date_str,
            "Type": row["type"],
            "Description": row["description"],
            "Amount": row["amount"],
            "Currency": row["currency"],
            "Exchange Rate": row["exchange_rate"],
            "Converted Amount (Base)": row["converted_amount"],
            "Running Balance (Base)": row["running_balance"]
        })
        
    df = pd.DataFrame(rows)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name="Ledger", index=False)
    output.seek(0)
    return output

def generate_pdf_ledger(ledger_data: List[Dict[str, Any]], person_name: str, base_currency: str) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    story = []
    
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor("#4F46E5"),
        spaceAfter=12
    )
    
    story.append(Paragraph(f"Settlement Hub Ledger Report", title_style))
    story.append(Paragraph(f"<b>Person Name:</b> {person_name}", styles['Normal']))
    story.append(Paragraph(f"<b>Report Generated:</b> {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    story.append(Spacer(1, 15))
    
    # Table data
    table_data = [["Date", "Description", "Amount", "Type", "Running Balance"]]
    for row in ledger_data:
        date_str = row["date"].strftime('%Y-%m-%d') if hasattr(row["date"], 'strftime') else str(row["date"])[:10]
        bal_str = f"{row['running_balance']:.2f} {base_currency}"
        amt_str = f"{row['amount']:.2f} {row['currency']}"
        table_data.append([
            date_str,
            row["description"][:30],
            amt_str,
            row["transaction_type"].capitalize(),
            bal_str
        ])
        
    t = Table(table_data, colWidths=[70, 200, 80, 80, 110])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#4F46E5")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F9FAFB")]),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('FONTSIZE', (0,1), (-1,-1), 9),
    ]))
    
    story.append(t)
    doc.build(story)
    buffer.seek(0)
    return buffer
