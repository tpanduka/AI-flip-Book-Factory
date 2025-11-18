import React, { useState, useCallback, useRef } from 'react';
import type { FlipbookPage, QAPageContent } from '../types';
import { Icon } from './Icon';
import Loader from './Loader';

// Explicitly declare globals from CDN
declare const jspdf: any;
declare const html2canvas: any;

interface FlipbookProps {
  pages: FlipbookPage[];
  onClose: () => void;
}

const PageDisclaimer: React.FC<{className?: string}> = ({ className }) => (
    <p className={`text-xs ${className}`}>Disclaimer: The answers are model answers and we do not take any responsibility.</p>
);

const CoverPage: React.FC<{ imageUrl: string; title: string }> = ({ imageUrl, title }) => (
  <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center p-8 overflow-hidden relative">
    <div className="absolute top-6 left-6 text-lg font-bold text-amber-400 font-mono">ICT cafe</div>
    <img src={imageUrl} alt="Flipbook Cover" className="max-h-[60%] w-auto object-contain rounded-lg shadow-2xl" />
    <h1 className="mt-8 text-4xl font-bold text-center text-white break-words">{title}</h1>
    <div className="absolute bottom-4 text-center w-full px-4">
        <PageDisclaimer className="text-slate-300" />
    </div>
  </div>
);

const TOCPageComponent: React.FC<{ title: string; items: string[], pageNumber: number }> = ({ title, items, pageNumber }) => (
  <div className="w-full h-full bg-slate-100 flex flex-col p-6 md:p-10 text-slate-800">
     <div className="text-lg font-bold text-amber-400 font-mono mb-4">ICT cafe</div>
    <div className="flex-grow overflow-y-auto">
        <h2 className="text-3xl font-bold text-center text-teal-600 mb-6 border-b-2 border-teal-200 pb-3">{title}</h2>
        <ul className="space-y-3">
        {items.map((item, index) => (
            <li key={index} className="flex items-start">
            <span className="font-semibold text-teal-600 mr-3">{index + 1}.</span>
            <span className="flex-1">{item}</span>
            </li>
        ))}
        </ul>
    </div>
     <div className="mt-auto pt-4 text-center text-slate-500">
        <PageDisclaimer className="mb-1" />
        <p className="font-semibold text-sm">{pageNumber}</p>
    </div>
  </div>
);


const QAPageComponent: React.FC<{ content: QAPageContent, pageNumber: number, questionNumber: number }> = ({ content, pageNumber, questionNumber }) => (
  <div className="w-full h-full bg-slate-100 flex flex-col p-6 md:p-10 text-slate-800">
    <div className="text-lg font-bold text-amber-400 font-mono mb-4">ICT cafe</div>
    <div className="flex-grow overflow-y-auto">
        <h2 className="text-xl font-bold text-teal-600 mb-2">Question {questionNumber}</h2>
        <p className="text-lg font-semibold mb-4">{content.question}</p>
        <h3 className="text-lg font-bold text-teal-600 mb-2">Answer</h3>
        <p className="mb-4 bg-teal-50 p-3 rounded-md">{content.answer}</p>
        <h3 className="text-lg font-bold text-teal-600 mb-2">Explanation</h3>
        <div className="text-sm prose" dangerouslySetInnerHTML={{ __html: content.explanation.replace(/\n/g, '<br />') }}></div>
    </div>
    <div className="mt-auto pt-4 text-center text-slate-500">
        <PageDisclaimer className="mb-1" />
        <p className="font-semibold text-sm">{pageNumber}</p>
    </div>
  </div>
);

const BlankPage: React.FC<{pageNumber: number}> = ({pageNumber}) => (
    <div className="w-full h-full bg-slate-100 p-10 flex flex-col justify-between">
        <div><div className="text-lg font-bold text-amber-400 font-mono">ICT cafe</div></div>
        <div className="text-center text-slate-500">
            <PageDisclaimer className="mb-1" />
            <p className="font-semibold text-sm">{pageNumber}</p>
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
            <div className="text-center p-4 bg-slate-700/50 rounded-lg h-full flex items-center justify-center">
                <p className="font-semibold text-teal-400">Thank you for your feedback!</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="p-3 bg-slate-700/50 rounded-lg space-y-2 h-full flex flex-col">
            <p className="text-center font-semibold text-white text-sm">Rate the AI Content</p>
            <div className="flex justify-center items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="text-amber-400 focus:outline-none"
                        aria-label={`Rate ${star} stars`}
                    >
                        <Icon
                            icon="star"
                            className={`w-6 h-6 transition-colors ${(hoverRating || rating) >= star ? 'fill-amber-400 stroke-amber-500' : 'fill-none stroke-current'}`}
                        />
                    </button>
                ))}
            </div>
            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any comments? (optional)"
                className="w-full flex-grow p-2 bg-slate-800 border border-slate-600 rounded-md text-xs text-white focus:ring-teal-500 focus:border-teal-500"
                rows={2}
            />
            <button type="submit" disabled={rating === 0} className="w-full px-2 py-1 bg-teal-600 rounded-md text-white text-sm font-semibold disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors">
                Submit
            </button>
        </form>
    )
}

const Flipbook: React.FC<FlipbookProps> = ({ pages, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');
  const pdfPagesRef = useRef<HTMLDivElement>(null);

  const totalPages = pages.length;

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 2));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 2, prev + 2));
  };
  
  const handleDownload = useCallback(async () => {
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
        // Using a higher scale for better quality, and jpeg for smaller file size.
        const canvas = await html2canvas(pageElement, { scale: 2.5, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/jpeg', 0.9);
        
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
      text: 'I just created a flipbook with AI Flipbook Factory! Check it out.',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
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
        return <QAPageComponent content={page.content} pageNumber={pageNumber} questionNumber={page.questionNumber}/>;
      case 'blank':
        return <BlankPage pageNumber={pageNumber}/>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-40">
       {isGeneratingPdf && <Loader message="Generating PDF..." progress={pdfProgress} />}
       
       <div className="w-full max-w-6xl flex justify-end items-center mb-4 gap-2">
         <button
            onClick={handleShare}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Icon icon="share" />
            {shareStatus === 'copied' ? 'Link Copied!' : 'Share'}
          </button>
          <button
            onClick={handleDownload}
            disabled={isGeneratingPdf}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-500 flex items-center gap-2 transition-colors"
          >
            <Icon icon="download" />
            {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Close</button>
       </div>
       
       <div className="w-full max-w-6xl aspect-[2/1.4] md:aspect-[2/1] relative shadow-2xl rounded-lg">
        <div className="w-full h-full grid grid-cols-2 gap-2">
            <div className="bg-white rounded-l-lg overflow-hidden shadow-lg">
                {renderPage(pages[currentPage], currentPage)}
            </div>
             <div className="bg-white rounded-r-lg overflow-hidden shadow-lg">
                {pages[currentPage + 1] && renderPage(pages[currentPage + 1], currentPage + 1)}
            </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mt-4 flex justify-between items-stretch gap-4">
        <div className="flex-1 max-w-xs">
            <FeedbackForm />
        </div>
        <div className="flex flex-1 items-center justify-center space-x-4 text-white">
            <button onClick={handlePrevPage} disabled={currentPage === 0} className="px-4 py-2 bg-teal-600 rounded-md disabled:bg-slate-500 transition-colors">Prev</button>
            <span className="font-semibold">Page {currentPage / 2 + 1} of {Math.ceil(totalPages / 2)}</span>
            <button onClick={handleNextPage} disabled={currentPage >= totalPages - 2} className="px-4 py-2 bg-teal-600 rounded-md disabled:bg-slate-500 transition-colors">Next</button>
        </div>
        <div className="flex-1 max-w-xs"></div>
      </div>


      {/* Hidden container for PDF generation */}
      <div className="absolute -z-10 -left-[9999px] top-0">
          <div ref={pdfPagesRef} style={{ width: '827px' }}>
              {pages.map((page, index) => (
                  <div key={index} className="page-container" style={{ width: '827px', height: '1169px', overflow: 'hidden', backgroundColor: 'white' }}>
                     {renderPage(page, index)}
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default Flipbook;