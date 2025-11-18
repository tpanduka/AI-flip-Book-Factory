import React, { useState, useCallback, useEffect } from 'react';
import type { FlipbookPage, ExplanationStyle, CoverTheme } from './types';
import { analyzePaper, generateCoverImage, generateVideoFromImage } from './services/geminiService';
import Loader from './components/Loader';
import Flipbook from './components/Flipbook';
import { Icon } from './components/Icon';


type AppView = 'home' | 'processing' | 'flipbook' | 'videoPlayer';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [pages, setPages] = useState<FlipbookPage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Flipbook state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle>('detailed');
  const [coverTheme, setCoverTheme] = useState<CoverTheme>('abstract');

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [showVideoOptionsModal, setShowVideoOptionsModal] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowOptionsModal(true);
      event.target.value = ''; // Reset file input
    }
  };
  
  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setShowVideoOptionsModal(true);
      event.target.value = ''; // Reset file input
    }
  };

  const processPaper = useCallback(async () => {
    if (!selectedFile) return;

    setShowOptionsModal(false);
    setView('processing');
    setError(null);

    try {
      setLoadingMessage('Generating creative cover...');
      const coverPrompt = `Analysis of ${selectedFile.name.split('.')[0]}`;
      const imageUrlPromise = generateCoverImage(coverPrompt, coverTheme);

      setLoadingMessage('Analyzing paper and generating answers...');
      const analysisPromise = analyzePaper(selectedFile, explanationStyle);
      
      const [imageUrl, analysisResult] = await Promise.all([imageUrlPromise, analysisPromise]);

      setLoadingMessage('Assembling your flipbook...');
      
      const tocItems = analysisResult.questions.map(q => q.question.substring(0, 80) + '...');
      
      const generatedPages: FlipbookPage[] = [
        { type: 'cover', imageUrl, title: analysisResult.title },
        { type: 'toc', title: 'Table of Contents', items: tocItems }
      ];

      analysisResult.questions.forEach((qa, index) => {
        generatedPages.push({ type: 'qa', content: qa, questionNumber: index + 1 });
      });

      // Ensure even number of pages for flipbook view
      if (generatedPages.length % 2 !== 0) {
        generatedPages.push({ type: 'blank' });
      }

      setPages(generatedPages);
      setView('flipbook');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      setView('home');
    } finally {
      setLoadingMessage('');
      setSelectedFile(null);
    }
  }, [selectedFile, explanationStyle, coverTheme]);
  
  const processVideo = useCallback(async () => {
    if (!videoFile) return;

    setShowVideoOptionsModal(false);
    setView('processing');
    setError(null);
    setGeneratedVideoUrl(null);

    try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
        }

        const videoUrl = await generateVideoFromImage(
            videoFile,
            videoAspectRatio,
            (progressMessage) => setLoadingMessage(progressMessage)
        );
        setGeneratedVideoUrl(videoUrl);
        setView('videoPlayer');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        if (errorMessage.includes('API key')) {
             setError(`${errorMessage} Please try again.`);
        } else {
            setError(errorMessage);
        }
        setView('home');
    } finally {
        setLoadingMessage('');
        setVideoFile(null);
    }
  }, [videoFile, videoAspectRatio]);


  const resetApp = () => {
    setView('home');
    setPages([]);
    setError(null);
    setSelectedFile(null);
    setShowOptionsModal(false);
    setVideoFile(null);
    setShowVideoOptionsModal(false);
    setGeneratedVideoUrl(null);
  };
  
  const Card: React.FC<{title: string, description: string, icon: React.ReactNode, children: React.ReactNode}> = ({title, description, icon, children}) => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 flex flex-col items-center text-center transform hover:scale-105 hover:border-teal-400 transition-all duration-300">
        <div className="p-4 bg-slate-700 rounded-full mb-4">
            {icon}
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6">{description}</p>
        {children}
    </div>
  );

  const OptionsModal = () => (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full">
            <h2 className="text-2xl font-bold text-center mb-6 text-teal-400">Customize Your Flipbook</h2>
            <div className="space-y-6">
                <div>
                    <label htmlFor="explanation-style" className="block text-sm font-medium text-slate-300 mb-2">Explanation Style</label>
                    <select
                        id="explanation-style"
                        value={explanationStyle}
                        onChange={(e) => setExplanationStyle(e.target.value as ExplanationStyle)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="concise">Concise</option>
                        <option value="detailed">Detailed</option>
                        <option value="step-by-step">Step-by-step</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="cover-theme" className="block text-sm font-medium text-slate-300 mb-2">Cover Theme</label>
                    <select
                        id="cover-theme"
                        value={coverTheme}
                        onChange={(e) => setCoverTheme(e.target.value as CoverTheme)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="abstract">Abstract</option>
                        <option value="minimalist">Minimalist</option>
                        <option value="vintage">Vintage</option>
                        <option value="futuristic">Futuristic</option>
                    </select>
                </div>
            </div>
            <div className="mt-8 flex justify-between gap-4">
                 <button onClick={() => setShowOptionsModal(false)} className="w-full px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition-colors duration-300">
                    Cancel
                </button>
                <button onClick={processPaper} className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                    <Icon icon="cog" className="w-5 h-5"/>
                    Generate
                </button>
            </div>
        </div>
    </div>
  );
  
  const VideoOptionsModal = () => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [videoFile]);

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full">
                <h2 className="text-2xl font-bold text-center mb-6 text-purple-400">Animate Your Image</h2>
                {previewUrl && <img src={previewUrl} alt="Image preview" className="w-full max-h-60 object-contain rounded-lg mb-6"/>}
                <div className="space-y-6">
                    <div>
                        <label htmlFor="aspect-ratio" className="block text-sm font-medium text-slate-300 mb-2">Aspect Ratio</label>
                        <select
                            id="aspect-ratio"
                            value={videoAspectRatio}
                            onChange={(e) => setVideoAspectRatio(e.target.value as '16:9' | '9:16')}
                            className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="16:9">16:9 (Landscape)</option>
                            <option value="9:16">9:16 (Portrait)</option>
                        </select>
                         <p className="text-xs text-slate-400 mt-2">
                            Note: Video generation can take several minutes. Please be patient. For billing information, see <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-400">here</a>.
                         </p>
                    </div>
                </div>
                <div className="mt-8 flex justify-between gap-4">
                     <button onClick={() => setShowVideoOptionsModal(false)} className="w-full px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition-colors duration-300">
                        Cancel
                    </button>
                    <button onClick={processVideo} className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                        <Icon icon="movie" className="w-5 h-5"/>
                        Animate
                    </button>
                </div>
            </div>
        </div>
    );
  }
  
  const VideoPlayerModal = () => (
     <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-3xl w-full flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-center text-purple-400">Your Animation is Ready!</h2>
            <video src={generatedVideoUrl!} controls autoPlay loop className="w-full rounded-lg bg-black" />
            <div className="flex justify-center gap-4">
                <a 
                    href={generatedVideoUrl!} 
                    download={`animated_video_${Date.now()}.mp4`}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors"
                >
                    <Icon icon="download" /> Download
                </a>
                <button onClick={resetApp} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Close</button>
            </div>
        </div>
    </div>
  )


  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 md:p-8 flex flex-col">
      <div className="flex-grow">
        <header className="text-center mb-12">
            <div className="text-2xl font-bold text-amber-400 font-mono mb-4">ICT cafe</div>
            <h1 className="text-4xl md:text-6xl font-extrabold">
            AI <span className="text-teal-400">Flipbook</span> Factory
            </h1>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
            Turn your documents, question papers, and ideas into stunning, interactive flipbooks with the power of AI.
            </p>
        </header>
        
        {showOptionsModal && <OptionsModal />}
        {showVideoOptionsModal && videoFile && <VideoOptionsModal />}

        {view === 'home' && (
            <main className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {error && <div className="md:col-span-2 lg:col-span-3 bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg text-center">{error}</div>}
                
                <Card
                    title="Papers Factory"
                    description="Upload a question paper, and our AI will generate answers, explanations, and a creative cover for a complete study guide flipbook."
                    icon={<Icon icon="book" className="w-8 h-8 text-teal-300"/>}
                >
                    <label htmlFor="paper-upload" className="w-full cursor-pointer mt-auto px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                        <Icon icon="upload"/>
                        Upload Paper
                    </label>
                    <input id="paper-upload" type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                </Card>

                <Card
                    title="Animate Image with Veo"
                    description="Upload a photo and our AI will bring it to life, generating a short video animation using Google's Veo model."
                    icon={<Icon icon="movie" className="w-8 h-8 text-purple-300"/>}
                >
                    <label htmlFor="video-upload" className="w-full cursor-pointer mt-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2">
                        <Icon icon="upload"/>
                        Upload Image
                    </label>
                    <input id="video-upload" type="file" className="hidden" accept="image/*" onChange={handleVideoFileChange} />
                </Card>

                <Card
                    title="Creative Flipbook"
                    description="Coming Soon: Combine documents, images, and links. Embed interactive quizzes, polls, and audio to create rich, multimedia experiences."
                    icon={<Icon icon="image" className="w-8 h-8 text-indigo-300"/>}
                >
                    <div className="w-full mt-auto flex flex-wrap gap-4 items-center justify-center text-slate-500">
                        <Icon icon="document" className="w-7 h-7"/>
                        <Icon icon="video" className="w-7 h-7"/>
                        <Icon icon="audio" className="w-7 h-7"/>
                        <Icon icon="link" className="w-7 h-7"/>
                    </div>
                    <button disabled className="w-full mt-4 px-6 py-3 bg-slate-600 rounded-lg font-semibold cursor-not-allowed">
                        Create Now
                    </button>
                </Card>
            </main>
        )}
      </div>


      {view === 'processing' && <Loader message={loadingMessage} />}
      
      {view === 'flipbook' && <Flipbook pages={pages} onClose={resetApp} />}
      
      {view === 'videoPlayer' && generatedVideoUrl && <VideoPlayerModal />}
      
      <footer className="text-center text-xs text-slate-500 py-4 mt-8">
        Disclaimer: The answers are model answers and we do not take any responsibility.
      </footer>
    </div>
  );
};

export default App;
