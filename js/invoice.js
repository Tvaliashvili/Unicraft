window.downloadInvoicePDF = function() {
  const total = cart.reduce((s,i) => s+i.price*i.qty, 0);
  const vat = total * 18 / 118;
  const dateStr   = document.getElementById('invoiceDate').textContent;
  const buyerId   = (document.getElementById('buyerIdInput')?.value   || '').trim();
  const buyerName = (document.getElementById('buyerNameInput')?.value || '').trim();
  const buyerPhone = (document.getElementById('buyerPhoneInput')?.value || '').trim();

  const rows = cart.map(i => `
    <tr>
      <td>${i.name}</td>
      <td style="text-align:center">${i.qty}</td>
      <td style="text-align:center">${i.unit||'ც'}</td>
      <td style="text-align:right">${parseFloat(i.price).toFixed(2)} ₾</td>
      <td style="text-align:right;font-weight:600">${(i.price*i.qty).toFixed(2)} ₾</td>
    </tr>`).join('');

  const html = '<!DOCTYPE html><html lang="ka">'
    + '<head><meta charset="UTF-8">'
    + '<title>' + currentInvoiceNo + '</title>'
    + '<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+Georgian:wght@400;500;600;700&display=swap" rel="stylesheet">'
    + '<style>'
    // ── reset & base ──
    + '@page{size:A4;margin:15mm}'
    + '*{box-sizing:border-box;margin:0;padding:0}'
    + 'body{font-family:\'Noto Sans Georgian\',sans-serif;color:#141210;padding:40px 48px;font-size:14px}'
    // ── header ──
    + '.header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:1px solid #f3f4f6;margin-bottom:0}'
    + '.logo{font-family:\'Bebas Neue\',sans-serif;font-size:30px;letter-spacing:0.025em;line-height:1}'
    + '.logo-o{color:#E8541A}'
    + '.header-date{font-size:12px;color:#141210;margin-top:4px}'
    + '.inv-label{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#141210;text-align:right}'
    + '.inv-no{font-family:monospace;font-weight:700;font-size:18px;color:#141210;text-align:right;margin-top:4px}'
    // ── parties ──
    + '.parties{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #f3f4f6;margin-bottom:20px}'
    + '.party{background:#F5F2EE;padding:14px 24px}'
    + '.party+.party{border-left:1px solid #E8E2DC}'
    + '.party-label{font-size:12px;font-weight:700;letter-spacing:0;text-transform:uppercase;color:#E8541A;margin-bottom:10px}'
    + '.plabel{font-size:12px;color:#141210;margin-bottom:2px}'
    + '.pval{font-weight:600;font-size:14px;color:#141210;margin-bottom:8px}'
    + '.pval-mono{font-family:monospace;font-weight:700;font-size:14px;color:#141210;letter-spacing:0.5px}'
    // ── products section ──
    + '.section-title{font-size:12px;font-weight:700;letter-spacing:0;text-transform:uppercase;color:#E8541A;margin-bottom:12px}'
    + 'table{width:100%;border-collapse:collapse;margin-bottom:4px;table-layout:fixed}'
    + 'thead tr{border-bottom:2px solid #f3f4f6}'
    + 'th{font-size:12px;font-weight:600;letter-spacing:0;text-transform:uppercase;color:#141210;padding:0 4px 8px;text-align:left}'
    + 'th:nth-child(1){width:40%}th:nth-child(2){width:12%}th:nth-child(3){width:10%}th:nth-child(4){width:19%}th:nth-child(5){width:19%}'
    + 'th.r{text-align:right}th.c{text-align:center}'
    + 'td{font-size:14px;padding:8px 4px;border-bottom:1px solid #F5F2EE}'
    + '.vat-row td{font-size:12px;color:#141210;padding:12px 4px 4px;border-bottom:none}'
    + '.total-row td{border-top:2px solid #141210;padding-top:12px;border-bottom:none}'
    + '.total-num{font-family:\'Bebas Neue\',sans-serif;font-size:24px;letter-spacing:0.025em;color:#141210;white-space:nowrap}'
    + '.total-lbl{font-size:12px;font-weight:700;letter-spacing:0;text-transform:uppercase;color:#141210}'
    // ── payment note ──
    + '.paynote{margin-top:12px;padding:12px 0;font-size:12px;color:#141210;text-align:center;line-height:1.625;border-top:1px solid #f9fafb}'
    + '.paynote strong{color:#141210;font-weight:700}'
    // ── disclaimer ──
    + '.disclaimer{margin-top:12px;padding:12px 16px;background:#F5F2EE;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;color:#141210;line-height:1.625}'
    + '.disclaimer strong{color:#141210}'
    // ── print ──
    + '@media print{@page{margin:12mm 14mm;size:A4}body{padding:0}-webkit-print-color-adjust:exact;print-color-adjust:exact;table{table-layout:fixed!important}}'
    + '</style></head><body>'

    // header
    + '<div class="header">'
    + '  <div><div class="logo"><span>UNI</span><span class="logo-o">CRAFT</span></div>'
    + '  <div class="header-date">' + dateStr + '</div></div>'
    + '  <div><div class="inv-label">ინვოისი</div><div class="inv-no">' + currentInvoiceNo + '</div></div>'
    + '</div>'

    // parties
    + '<div class="parties">'
    + '  <div class="party">'
    + '    <div class="party-label">გამყიდველი</div>'
    + '    <div class="plabel">დასახელება</div><div class="pval">შპს უნიკრაფტი</div>'
    + '    <div class="plabel">ბანკი</div><div class="pval">საქართველოს ბანკი</div>'
    + '    <div class="plabel">ანგარიშის ნომერი</div><div class="pval-mono">GE95BG0000000609563008</div>'
    + '  </div>'
    + '  <div class="party">'
    + '    <div class="party-label">მყიდველი</div>'
    + '    <div class="plabel">დასახელება / სახელი</div><div class="pval">' + (buyerName || '–') + '</div>'
    + '    <div class="plabel">პირ. ნომ. / საიდ. კოდი</div><div class="pval-mono">' + (buyerId || '–') + '</div>'
    + '    <div class="plabel">ტელეფონი</div><div class="pval">' + (buyerPhone || '–') + '</div>'
    + '  </div>'
    + '</div>'

    // products
    + '<div style="padding:20px 0 8px">'
    + '  <div class="section-title">პროდუქციის ჩამონათვალი</div>'
    + '  <table>'
    + '    <thead><tr>'
    + '      <th>დასახელება</th>'
    + '      <th class="c">რ-ბა</th>'
    + '      <th class="c">ერთ.</th>'
    + '      <th class="r">ფასი</th>'
    + '      <th class="r">სულ</th>'
    + '    </tr></thead>'
    + '    <tbody>' + rows + '</tbody>'
    + '    <tfoot>'
    + '      <tr class="vat-row">'
    + '        <td colspan="4" style="text-align:right;padding-right:8px">მათ შორის დღგ (18%)</td>'
    + '        <td style="text-align:right">' + vat.toFixed(2) + ' ₾</td>'
    + '      </tr>'
    + '      <tr class="total-row">'
    + '        <td colspan="4" style="text-align:right;padding-right:8px"><span class="total-lbl">სულ გადასახდელი</span></td>'
    + '        <td style="text-align:right"><span class="total-num">' + total.toFixed(2) + '&thinsp;₾</span></td>'
    + '      </tr>'
    + '    </tfoot>'
    + '  </table>'
    + '</div>'

    // payment note
    + '<div class="paynote">გთხოვთ მითითებულ ანგარიშის ნომერზე გადაიხადოთ პროდუქციის ღირებულების თანხა.<br>'
    + 'თანხის გადმორიცხვისას დანიშნულებაში მიუთითეთ ინვოისის ნომერი, ხოლო გადახდის ქვითარი გადმოგვიგზავნეთ ელექტრონულ ფოსტაზე: <strong>LLCunicraft@gmail.com</strong> ან მოგვწერეთ ონლაინ ჩატში საიტზე.</div>'

    // disclaimer
    + '<div class="disclaimer"><strong>შენიშვნა:</strong> აღნიშნული ინვოისი ძალაშია მისი დაგენერირების თარიღის დღეს და შეიძლება შეიცვალოს რამდენიმე დღის შემდეგ. შპს უნიკრაფტი იტოვებს უფლებას ნებისმიერ დროს შეცვალოს ფასები ცალმხრივად და შეტყობინების გარეშე. წინამდებარე ინვოისი არ წარმოადგენს ფასის ფიქსაციის ვალდებულებას.</div>'

    + '</body></html>';

  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var win = window.open(url, '_blank', 'width=820,height=950');
  setTimeout(function() { win.focus(); win.print(); URL.revokeObjectURL(url); }, 900);
};
