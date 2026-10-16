import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const label = value => String(value || '').replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
const created = value => { const date=new Date(value);return value&&Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'—'; };

// Loaded only when PDF is chosen; CSV and normal browsing do not load PDF code.
export async function downloadJobsPdf(jobs, filename, {signal,scope='Jobs'}={}) {
  signal?.throwIfAborted();
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
  doc.setProperties({title:'Jooblie · Job management',subject:scope,creator:'Jooblie'});
  const generated=new Date().toLocaleString();
  autoTable(doc,{
    head:[['Job / company','Origin portal','Created','Status']],
    body:jobs.map(job=>[
      [job.title||'Untitled job',job.companies?.name||'Unavailable company',[job.city,job.province].filter(Boolean).join(', ')||(job.is_remote?'Remote':'')].filter(Boolean).join('\n'),
      job.sites?.name||'Unavailable portal',created(job.created_at),label(job.status)||'Unknown'
    ]),
    theme:'grid',startY:34,margin:{top:34,right:14,bottom:17,left:14},
    styles:{font:'helvetica',fontSize:9,cellPadding:4,textColor:[45,66,97],lineColor:[226,234,245],lineWidth:0.15,overflow:'linebreak',valign:'middle'},
    headStyles:{fillColor:[239,245,254],textColor:[35,75,130],fontStyle:'bold'},
    alternateRowStyles:{fillColor:[250,252,255]},
    columnStyles:{0:{cellWidth:125},1:{cellWidth:63},2:{cellWidth:42},3:{cellWidth:39}},
    rowPageBreak:'avoid',showHead:'everyPage',
    didDrawPage:()=>{
      doc.setFont('helvetica','bold');doc.setFontSize(17);doc.setTextColor(17,43,81);doc.text('Jooblie / Job management',14,15);
      doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(85,106,137);
      doc.text(scope+' · '+jobs.length.toLocaleString()+' jobs',14,23);
      doc.text('Generated '+generated,283,23,{align:'right'});
    }
  });
  const pages=doc.getNumberOfPages();
  for(let page=1;page<=pages;page++){
    doc.setPage(page);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100,119,145);
    doc.text('Jooblie · Job export',14,201);doc.text('Page '+page+' of '+pages,283,201,{align:'right'});
  }
  signal?.throwIfAborted();
  await doc.save(filename+'.pdf',{returnPromise:true});
}
