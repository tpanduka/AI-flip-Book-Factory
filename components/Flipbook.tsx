
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { FlipbookPage, QAPageContent } from '../types';
import { Icon } from './Icon';
import Loader from './Loader';
import { generateIllustration } from '../services/geminiService';

// Explicitly declare globals from CDN
declare const jspdf: any;
declare const html2canvas: any;

interface FlipbookProps {
  pages: FlipbookPage[];
  onClose: () => void;
  onUpdatePage: (index: number, updatedPage: FlipbookPage | ((page: FlipbookPage) => FlipbookPage)) => void;
}

const PageDisclaimer: React.FC<{className?: string}> = ({ className }) => (
    <p className={`text-xs ${className}`}>Disclaimer: The content is AI-generated and we do not take any responsibility.</p>
);

const CoverPage: React.FC<{ imageUrl: string; title: string }> = ({ imageUrl, title }) => (
  <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center p-6 md:p-8 overflow-hidden relative border-r border-slate-900 shadow-inner">
    <div className="absolute top-6 left-6 text-lg font-bold text-amber-400 font-mono">ICT cafe</div>
    <div className="relative w-full flex-1 flex items-center justify-center overflow-hidden my-4">
        <img src={imageUrl} alt="Flipbook Cover" className="h-full w-auto object-contain rounded-md shadow-2xl border border-slate-600" />
    </div>
    <div className="mt-4 w-full text-center z-10">
        <h1 className="text-2xl md:text-3xl font-bold text-white break-words drop-shadow-md mb-2 font-serif">{title}</h1>
        <p className="text-md text-amber-300 font-medium">Author: ICT Cafe</p>
    </div>
    <div className="absolute bottom-4 text-center w-full px-4">
        <PageDisclaimer className="text-slate-500" />
    </div>
  </div>
);

const TOCPageComponent: React.FC<{ title: string; items: string[], pageNumber: number }> = ({ title, items, pageNumber }) => (
  <div className="w-full h-full bg-[#fdfbf7] flex flex-col p-8 text-slate-800 shadow-[inset_20px_0_20px_-20px_rgba(0,0,0,0.2)]">
     <div className="text-lg font-bold text-amber-600 font-mono mb-6 border-b border-slate-300 pb-2">ICT cafe</div>
    <div className="flex-grow overflow-y-auto">
        <h2 className="text-3xl font-bold text-center text-teal-800 mb-8 font-serif">{title}</h2>
        <ul className="space-y-4">
        {items.map((item, index) => (
            <li key={index} className="flex items-start group">
                <span className="font-bold text-teal-600 mr-4 w-6 text-right group-hover:text-teal-500 transition-colors">{index + 1}.</span>
                <span className="flex-1 text-slate-700 font-medium border-b border-dotted border-slate-300 pb-1">{item}</span>
            </li>
        ))}
        </ul>
    </div>
     <div className="mt-auto pt-6 text-center text-slate-400">
        <PageDisclaimer className="mb-1" />
        <p className="font-mono text-sm">- {pageNumber} -</p>
    </div>
  </div>
);


const QAPageComponent: React.FC<{ 
    content: QAPageContent, 
    pageNumber: number, 
    questionNumber: number, 
    onGenerateIllustration: () => void
}> = ({ content, pageNumber, questionNumber, onGenerateIllustration }) => {
    const [lang, setLang] = useState<'en' | 'si' | 'ta'>('en');
    const [hasRequested, setHasRequested] = useState(false);

    useEffect(() => {
        if (!content.illustrationUrl && !hasRequested) {
            setHasRequested(true);
            onGenerateIllustration();
        }
    }, [content.illustrationUrl, hasRequested, onGenerateIllustration]);

    const getLocalizedContent = () => {
        const suffix = lang === 'en' ? '' : lang === 'si' ? '_sinhala' : '_tamil';
        return {
            q: (content as any)[`question${suffix}`] || content.question,
            a: (content as any)[`answer${suffix}`] || content.answer,
            e: (content as any)[`explanation${suffix}`] || content.explanation,
        };
    };

    const { q, a, e } = getLocalizedContent();

    return (
      <div className="w-full h-full bg-[#fdfbf7] flex flex-col p-8 text-slate-800 shadow-[inset_20px_0_20px_-20px_rgba(0,0,0,0.2)]">
        <div className="flex justify-between items-start mb-6 border-b border-slate-300 pb-2">
            <div className="text-lg font-bold text-amber-600 font-mono">ICT cafe</div>
            <div className="flex gap-1">
                {['en', 'si', 'ta'].map((l) => (
                    <button
                        key={l}
                        onClick={() => setLang(l as any)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all uppercase tracking-wider ${lang === l ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                    >
                        {l}
                    </button>
                ))}
            </div>
        </div>

        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 pr-2">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 mb-4">
                <h2 className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-1">Question {questionNumber}</h2>
                <p className="text-lg font-serif font-medium text-slate-900">{q}</p>
            </div>
            
            <div className="flex gap-4 mb-6 flex-col md:flex-row">
                 <div className="flex-1">
                    <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-1">Answer</h3>
                    <p className="bg-teal-50 p-3 rounded-md shadow-sm border border-teal-100 text-slate-800 font-medium">{a}</p>
                 </div>
                 <div className="w-full md:w-1/3 flex-shrink-0">
                    <div className="w-full aspect-square bg-white p-2 rounded border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                        {content.illustrationUrl ? (
                            <img src={content.illustrationUrl} alt="Answer Illustration" className="w-full h-full object-contain" />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300">
                                <Icon icon="sparkles" className="w-6 h-6 mb-1 animate-pulse text-purple-300" />
                                <span className="text-[10px]">Drawing...</span>
                            </div>
                        )}
                    </div>
                 </div>
            </div>

            <h3 className="text-xs font-bold text-teal-600 uppercase tracking-wide mb-1">Explanation</h3>
            <div className="text-sm leading-relaxed prose max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: e.replace(/\n/g, '<br />') }}></div>
        </div>
        <div className="mt-auto pt-4 text-center text-slate-400">
            <PageDisclaimer className="mb-1" />
            <p className="font-mono text-sm">- {pageNumber} -</p>
        </div>
      </div>
    );
};

const StoryPageComponent: React.FC<{
    title: string,
    content: string,
    illustrationUrl?: string,
    pageNumber: number,
    onGenerateIllustration: () => void
}> = ({ title, content, illustrationUrl, pageNumber, onGenerateIllustration }) => {
    const [hasRequested, setHasRequested] = useState(false);

    useEffect(() => {
        if (!illustrationUrl && !hasRequested) {
            setHasRequested(true);
            onGenerateIllustration();
        }
    }, [illustrationUrl, hasRequested, onGenerateIllustration]);

    return (
        <div className="w-full h-full bg-[#fdfbf7] flex flex-col p-8 text-slate-800 shadow-[inset_20px_0_20px_-20px_rgba(0,0,0,0.2)]">
            <div className="flex justify-between items-start mb-4 border-b border-slate-300 pb-2">
                <div className="text-lg font-bold text-amber-600 font-mono">ICT cafe</div>
            </div>
            <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 pr-2">
                <h2 className="text-2xl font-bold text-teal-800 mb-6 font-serif">{title}</h2>
                
                <div className="float-right w-[45%] ml-6 mb-4 flex flex-col items-center justify-center bg-white p-2 rounded shadow-md transform rotate-1 transition-transform hover:rotate-0 duration-300">
                     {illustrationUrl ? (
                        <img src={illustrationUrl} alt="Illustration" className="w-full rounded object-cover aspect-square" />
                    ) : (
                        <div className="w-full aspect-square flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                            <Icon icon="sparkles" className="w-8 h-8 mb-2 animate-pulse text-purple-300" />
                            <span className="text-xs font-medium">Painting...</span>
                        </div>
                    )}
                </div>
                
                <div className="text-lg leading-8 font-serif text-slate-700 text-justify">
                    {content}
                </div>
            </div>
            <div className="mt-auto pt-4 text-center text-slate-400">
                <PageDisclaimer className="mb-1" />
                <p className="font-mono text-sm">- {pageNumber} -</p>
            </div>
        </div>
    );
}

const BlankPage: React.FC<{pageNumber: number}> = ({pageNumber}) => (
    <div className="w-full h-full bg-[#fdfbf7] p-10 flex flex-col justify-between shadow-[inset_20px_0_20px_-20px_rgba(0,0,0,0.2)]">
        <div><div className="text-lg font-bold text-amber-600 font-mono">ICT cafe</div></div>
        <div className="text-center text-slate-300">
            <PageDisclaimer className="mb-1" />
            <p className="font-mono text-sm">- {pageNumber} -</p>
        </div>
    </div>
);

const FeedbackForm: React.FC = () => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Feedback submitted:', { rating, comment });
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="text-center p-4 bg-slate-700/50 rounded-lg h-full flex items-center justify-center animate-fadeIn">
                <div>
                    <Icon icon="star" className="w-8 h-8 text-amber-400 mx-auto mb-2 fill-amber-400" />
                    <p className="font-semibold text-teal-400">Thanks for your feedback!</p>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-800/80 backdrop-blur rounded-lg space-y-3 h-full flex flex-col border border-slate-700">
            <p className="text-center font-semibold text-white text-sm">Rate this Flipbook</p>
            <div className="flex justify-center items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="text-amber-400 focus:outline-none transition-transform hover:scale-110"
                        aria-label={`Rate ${star} stars`}
                    >
                        <Icon
                            icon="star"
                            className={`w-6 h-6 transition-colors ${(hoverRating || rating) >= star ? 'fill-amber-400 stroke-amber-500' : 'fill-none stroke-slate-500'}`}
                        />
                    </button>
                ))}
            </div>
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="How can we improve?"
                className="w-full flex-grow p-2 bg-slate-900/50 border border-slate-600 rounded-md text-xs text-white focus:ring-teal-500 focus:border-teal-500 resize-none"
            />
            <button type="submit" disabled={rating === 0} className="w-full px-2 py-1.5 bg-teal-600 rounded-md text-white text-sm font-semibold disabled:bg-slate-600 disabled:cursor-not-allowed transition-all hover:bg-teal-500 shadow-lg">
                Submit Feedback
            </button>
        </form>
    )
}

const Flipbook: React.FC<FlipbookProps> = ({ pages, onClose, onUpdatePage }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'shared'>('idle');
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  
  const requestedIllustrations = useRef<Set<number>>(new Set());
  const pdfPagesRef = useRef<HTMLDivElement>(null);

  const totalPages = pages.length;

  const handlePrevPage = () => {
    if (currentPage > 0) {
        setFlipDirection('prev');
        setTimeout(() => {
             setCurrentPage((prev) => Math.max(0, prev - 2));
        }, 300);
        setTimeout(() => {
            setFlipDirection(null);
        }, 600);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
        setFlipDirection('next');
        setTimeout(() => {
            setCurrentPage((prev) => Math.min(totalPages - (totalPages % 2 === 0 ? 2 : 1), prev + 2));
        }, 300);
        setTimeout(() => {
            setFlipDirection(null);
        }, 600);
    }
  };

  const handleGenerateIllustration = useCallback(async (index: number, prompt: string) => {
    if (requestedIllustrations.current.has(index)) return;
    requestedIllustrations.current.add(index);

    try {
        const imageUrl = await generateIllustration(prompt);
        
        onUpdatePage(index, (prevPage) => {
            if (prevPage.type === 'qa') {
                return { ...prevPage, content: { ...prevPage.content, illustrationUrl: imageUrl } };
            }
            if (prevPage.type === 'story') {
                return { ...prevPage, illustrationUrl: imageUrl };
            }
            return prevPage;
        });

    } catch (error) {
        console.error("Failed to generate illustration", error);
        requestedIllustrations.current.delete(index); // Retry allowed on fail
    }
  }, [onUpdatePage]);

  const handleDownloadHtml = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Flipbook - ICT Cafe</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background-color: #0f172a; color: white; font-family: serif; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; }
        .book-container { display: flex; aspect-ratio: 1.414/1; width: 100%; max-width: 1000px; background: #fdfbf7; color: #1e293b; border-radius: 4px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        .page { width: 50%; height: 100%; padding: 40px; overflow-y: auto; position: relative; border-right: 1px solid #e2e8f0; }
        .page:last-child { border-right: none; }
        .controls { margin-top: 20px; display: flex; gap: 20px; align-items: center; }
        button { background-color: #0d9488; color: white; padding: 10px 20px; border-radius: 5px; border: none; cursor: pointer; transition: background 0.3s; }
        button:hover { background-color: #0f766e; }
        button:disabled { background-color: #475569; cursor: not-allowed; }
        img { max-width: 100%; height: auto; border-radius: 5px; }
    </style>
</head>
<body>
    <h1 class="text-2xl font-bold mb-4 text-amber-400 font-mono">ICT Cafe Flipbook</h1>
    <div id="book" class="book-container"></div>
    <div class="controls">
        <button id="prevBtn">Previous</button>
        <span id="pageIndicator">Page 1</span>
        <button id="nextBtn">Next</button>
    </div>

    <script>
        const pages = ${JSON.stringify(pages)};
        let currentPage = 0;

        function renderPageContent(page, index) {
            const num = index + 1;
            let html = '<div class="text-xs text-amber-600 font-bold mb-2 font-mono">ICT cafe</div>';
            
            if (page.type === 'cover') {
                html += '<div class="flex flex-col items-center justify-center h-full bg-slate-800 text-white p-4"><img src="' + page.imageUrl + '" class="max-h-[60%] object-contain mb-4 shadow-lg"><h1 class="text-2xl font-bold text-center font-serif">' + page.title + '</h1><p class="mt-2 text-amber-300">Author: ICT Cafe</p></div>';
            } else if (page.type === 'toc') {
                html += '<h2 class="text-2xl font-bold text-teal-800 mb-4 text-center font-serif">' + page.title + '</h2><ul class="space-y-2">';
                page.items.forEach((item, i) => html += '<li class="flex gap-2 border-b border-dotted border-slate-300 pb-1"><span class="font-bold text-teal-600">' + (i+1) + '.</span> ' + item + '</li>');
                html += '</ul>';
            } else if (page.type === 'qa') {
                html += '<h2 class="text-xs font-bold text-teal-600 uppercase">Question ' + page.questionNumber + '</h2>';
                html += '<p class="font-serif font-medium text-lg mb-4">' + page.content.question + '</p>';
                html += '<h3 class="font-bold text-teal-600 text-xs uppercase">Answer</h3>';
                html += '<p class="bg-teal-50 p-2 rounded mb-3 text-sm">' + page.content.answer + '</p>';
                if(page.content.illustrationUrl) html += '<img src="' + page.content.illustrationUrl + '" class="mb-3 max-h-40 mx-auto rounded">';
                html += '<h3 class="font-bold text-teal-600 text-xs uppercase">Explanation</h3>';
                html += '<div class="text-sm prose">' + page.content.explanation + '</div>';
            } else if (page.type === 'story') {
                html += '<h2 class="text-xl font-bold text-teal-800 mb-3 font-serif">' + page.title + '</h2>';
                 if(page.illustrationUrl) html += '<img src="' + page.illustrationUrl + '" class="mb-3 max-h-40 float-right ml-2 rounded w-1/2 shadow">';
                 html += '<div class="text-sm leading-relaxed font-serif text-justify whitespace-pre-wrap">' + page.content + '</div>';
            }
            
            if(page.type !== 'cover') {
                html += '<div class="mt-auto pt-4 text-center text-slate-400 text-xs"><p>Disclaimer: AI generated content.</p><p>- ' + num + ' -</p></div>';
            }
            return html;
        }

        function render() {
            const book = document.getElementById('book');
            book.innerHTML = '';
            
            const leftPage = document.createElement('div');
            leftPage.className = 'page';
            leftPage.innerHTML = renderPageContent(pages[currentPage], currentPage);
            book.appendChild(leftPage);

            if (currentPage + 1 < pages.length) {
                const rightPage = document.createElement('div');
                rightPage.className = 'page';
                rightPage.innerHTML = renderPageContent(pages[currentPage + 1], currentPage + 1);
                book.appendChild(rightPage);
            } else {
                 const rightPage = document.createElement('div');
                 rightPage.className = 'page';
                 book.appendChild(rightPage);
            }

            document.getElementById('pageIndicator').innerText = 'Page ' + (currentPage/2 + 1) + ' of ' + Math.ceil(pages.length/2);
            document.getElementById('prevBtn').disabled = currentPage === 0;
            document.getElementById('nextBtn').disabled = currentPage >= pages.length - 2;
        }

        document.getElementById('prevBtn').onclick = () => { if(currentPage > 0) { currentPage -= 2; render(); } };
        document.getElementById('nextBtn').onclick = () => { if(currentPage < pages.length - 2) { currentPage += 2; render(); } };
        
        render();
    </script>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'creative_flipbook.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleDownloadPdf = useCallback(async () => {
    if (!pdfPagesRef.current) return;
    setIsGeneratingPdf(true);
    setPdfProgress('');

    const { jsPDF } = jspdf;
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: 'a4',
        compress: true,
    });

    const pageElements = Array.from(pdfPagesRef.current.children) as HTMLElement[];

    for (let i = 0; i < pageElements.length; i++) {
        setPdfProgress(`Processing page ${i + 1} of ${pageElements.length}`);
        const pageElement = pageElements[i];
        const canvas = await html2canvas(pageElement, { scale: 2.0, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        if (i > 0) {
            pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    }

    setPdfProgress('Saving PDF...');
    pdf.save('flipbook.pdf');
    setIsGeneratingPdf(false);
    setPdfProgress('');
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: 'AI Flipbook Factory',
      text: 'I just created a study flipbook with AI Flipbook Factory! Create yours now.',
      url: window.location.href,
    };

    try {
        if (navigator.share && navigator.canShare(shareData)) {
            await navigator.share(shareData);
            setShareStatus('shared');
        } else {
             throw new Error("Share API not supported");
        }
    } catch (error) {
        navigator.clipboard.writeText(shareData.url);
        setShareStatus('copied');
        setTimeout(() => setShareStatus('idle'), 2000);
    }
  };

  const renderPage = (page: FlipbookPage, index: number) => {
    const pageNumber = index + 1;
    switch (page.type) {
      case 'cover':
        return <CoverPage imageUrl={page.imageUrl} title={page.title} />;
      case 'toc':
        return <TOCPageComponent title={page.title} items={page.items} pageNumber={pageNumber} />;
      case 'qa':
        return <QAPageComponent 
            content={page.content} 
            pageNumber={pageNumber} 
            questionNumber={page.questionNumber} 
            onGenerateIllustration={() => handleGenerateIllustration(index, page.content.question)}
        />;
      case 'story':
          return <StoryPageComponent 
            title={page.title}
            content={page.content}
            illustrationUrl={page.illustrationUrl}
            pageNumber={pageNumber}
            onGenerateIllustration={() => handleGenerateIllustration(index, page.illustrationPrompt)}
          />
      case 'blank':
        return <BlankPage pageNumber={pageNumber}/>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-40 h-full w-full overflow-hidden">
       {isGeneratingPdf && <Loader message="Generating PDF..." progress={pdfProgress} />}
       
       <style>{`
        .perspective-container {
            perspective: 2000px;
        }
        .book-spine {
            transform-style: preserve-3d;
            box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        .book-page {
            backface-visibility: hidden; 
        }
        .flip-enter {
             animation: bookEnter 0.8s ease-out forwards;
        }
        @keyframes bookEnter {
            from { transform: translateY(50px) rotateX(10deg); opacity: 0; }
            to { transform: translateY(0) rotateX(0); opacity: 1; }
        }
        .turning-next {
            animation: turnNext 0.6s ease-in-out forwards;
        }
        .turning-prev {
            animation: turnPrev 0.6s ease-in-out forwards;
        }
        @keyframes turnNext {
            0% { transform: perspective(2000px) rotateY(0); }
            50% { transform: perspective(2000px) rotateY(-90deg) scale(0.9); opacity: 0.8; }
            100% { transform: perspective(2000px) rotateY(0); }
        }
        @keyframes turnPrev {
            0% { transform: perspective(2000px) rotateY(0); }
            50% { transform: perspective(2000px) rotateY(90deg) scale(0.9); opacity: 0.8; }
            100% { transform: perspective(2000px) rotateY(0); }
        }
       `}</style>

       {/* Fixed Header for Controls */}
       <div className="bg-slate-800 border-b border-slate-700 p-4 shadow-lg flex flex-wrap gap-3 justify-between items-center z-50 relative shrink-0">
          <div className="flex items-center gap-2">
             <div className="bg-teal-500 p-1.5 rounded-lg shadow-lg shadow-teal-500/20"><Icon icon="book" className="w-5 h-5 text-white" /></div>
             <span className="font-bold text-white text-lg hidden sm:block tracking-tight">AI Flipbook Factory</span>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center">
             <button
                onClick={handleShare}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Icon icon="share" className="w-4 h-4" />
                {shareStatus === 'copied' ? 'Copied' : shareStatus === 'shared' ? 'Shared' : 'Share'}
              </button>
              <button
                onClick={handleDownloadHtml}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Icon icon="html" className="w-4 h-4" />
                <span className="inline">HTML</span>
              </button>
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-slate-600 flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Icon icon="download" className="w-4 h-4" />
                <span className="inline">PDF</span>
              </button>
              <button onClick={onClose} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors shadow-sm ml-2">Close</button>
          </div>
       </div>
       
       {/* Scrollable Content Area */}
       <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col items-center bg-slate-900 relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 to-slate-900">
          
          {/* Flipbook Container */}
          <div className="w-full max-w-6xl aspect-[1.414/1] relative perspective-container shrink-0 mb-8 flex items-center justify-center">
            <div 
                key={currentPage} 
                className={`w-full h-full grid grid-cols-2 gap-0 rounded-sm book-spine flip-enter ${flipDirection === 'next' ? 'turning-next' : flipDirection === 'prev' ? 'turning-prev' : ''}`}
            >
                {/* Left Page */}
                <div className="bg-[#fdfbf7] rounded-l-sm overflow-hidden border-r border-slate-300 h-full relative book-page shadow-[-5px_0_15px_rgba(0,0,0,0.1)]">
                    <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-400/20 to-transparent z-10 pointer-events-none"></div>
                    {renderPage(pages[currentPage], currentPage)}
                </div>
                
                {/* Right Page */}
                 <div className="bg-[#fdfbf7] rounded-r-sm overflow-hidden h-full relative book-page shadow-[5px_0_15px_rgba(0,0,0,0.1)]">
                     <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-slate-400/20 to-transparent z-10 pointer-events-none"></div>
                    {pages[currentPage + 1] ? renderPage(pages[currentPage + 1], currentPage + 1) : <div className="w-full h-full bg-[#fdfbf7]"></div>}
                </div>
            </div>
          </div>

          {/* Bottom Controls */}
          <div className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-stretch gap-6 mb-8">
            <div className="flex-1 max-w-xs hidden md:block">
                <FeedbackForm />
            </div>
            <div className="flex flex-1 items-center justify-center space-x-6 text-white">
                <button 
                    onClick={handlePrevPage} 
                    disabled={currentPage === 0} 
                    className="px-8 py-3 bg-teal-600 rounded-full disabled:bg-slate-700 disabled:text-slate-500 transition-all hover:bg-teal-500 hover:scale-105 shadow-lg font-bold flex items-center gap-2 ring-2 ring-teal-600/50 disabled:ring-0"
                >
                    <Icon icon="back" className="w-5 h-5" /> Prev
                </button>
                <span className="font-mono font-semibold bg-slate-800/80 backdrop-blur px-4 py-2 rounded-lg border border-slate-600 shadow-inner min-w-[120px] text-center">
                    {currentPage / 2 + 1} / {Math.ceil(totalPages / 2)}
                </span>
                <button 
                    onClick={handleNextPage} 
                    disabled={currentPage >= totalPages - (totalPages % 2 === 0 ? 2 : 1)} 
                    className="px-8 py-3 bg-teal-600 rounded-full disabled:bg-slate-700 disabled:text-slate-500 transition-all hover:bg-teal-500 hover:scale-105 shadow-lg font-bold flex items-center gap-2 ring-2 ring-teal-600/50 disabled:ring-0"
                >
                    Next <Icon icon="back" className="w-5 h-5 rotate-180" />
                </button>
            </div>
            <div className="flex-1 max-w-xs hidden md:block"></div>
          </div>
      </div>

      {/* Hidden container for PDF generation - Fixed A4 dimensions */}
      <div className="absolute -z-10 -left-[9999px] top-0">
          <div ref={pdfPagesRef} style={{ width: '595px' }}>
              {pages.map((page, index) => (
                  <div key={index} className="page-container" style={{ width: '595px', height: '842px', overflow: 'hidden', backgroundColor: '#ffffff' }}>
                     {renderPage(page, index)}
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default Flipbook;
