import './PageHero.css';
export default function PageHero({eyebrow,title,text,children,accent,imageSrc,imageAlt='',imageCaption='Illustrative workplace photography'}){
 return <section className={'page-hero public-page-hero'+(imageSrc?' public-page-hero--image':'')}><div className="container"><div className="public-page-hero__layout"><div className="public-page-hero__copy">{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}{accent&&<> <em>{accent}</em></>}</h1>{text&&<p>{text}</p>}{children}</div>{imageSrc&&<figure className="public-page-hero__visual"><img src={imageSrc} alt={imageAlt} width="960" height="720" fetchpriority="high" decoding="async"/>{imageCaption&&<figcaption>{imageCaption}</figcaption>}</figure>}</div></div></section>
}
