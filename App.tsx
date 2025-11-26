
import React, { useState, useCallback, useEffect } from 'react';
import type { FlipbookPage, ExplanationStyle, CoverTheme } from './types';
import { analyzePaper, generateCoverImage, generateVideoFromImage, generateCreativeBook } from './services/geminiService';
import Loader from './components/Loader';
import Flipbook from './components/Flipbook';
import { Icon } from './components/Icon';

type AppView = 'home' | 'processing' | 'flipbook' | 'videoPlayer';

// --- Helper Components ---

const ApiKeyModal: React.FC<{ onKeySubmit: (key: string) => void }> = ({ onKeySubmit }) => {
  const [key, setKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onKeySubmit(key.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center animate-fadeIn">
        <Icon icon="sparkles" className="w-10 h-10 text-amber-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-3">Welcome!</h2>
        <p className="text-slate-400 mb-6">
          Please enter your Google Gemini API key to continue. This key is stored only in your browser for this session.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your API key here"
            className="w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-white focus:ring-teal-500 focus:border-teal-500 text-center"
          />
          <button
            type="submit"
            disabled={!key.trim()}
            className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg font-semibold transition-colors duration-300 disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            Save & Continue
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-4">
          Don't have a key? Get one for free at{' '}
          <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="underline hover:text-teal-400">
            Google AI Studio
          </a>.
        </p>
      </div>
    </div>
  );
};


const Card: React.FC<{title: string, description: string, icon: React.ReactNode, children: React.ReactNode}> = ({title, description, icon, children}) => (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 flex flex-col items-center text-center transform hover:scale-105 hover:border-teal-400 transition-all duration-300 shadow-xl">
        <div className="p-4 bg-slate-700 rounded-full mb-4 shadow-inner">
            {icon}
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6">{description}</p>
        {children}
    </div>
);

interface OptionsModalProps {
    explanationStyle: ExplanationStyle;
    setExplanationStyle: (style: ExplanationStyle) => void;
    coverTheme: CoverTheme;
    setCoverTheme: (theme: CoverTheme) => void;
    onClose: () => void;
    onGenerate: () => void;
}

const OptionsModal: React.FC<OptionsModalProps> = ({ explanationStyle, setExplanationStyle, coverTheme, setCoverTheme, onClose, onGenerate }) => (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-fadeIn">
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
                 <button onClick={onClose} className="w-full px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition-colors duration-300">
                    Cancel
                </button>
                <button onClick={onGenerate} className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-teal-900/50">
                    <Icon icon="cog" className="w-5 h-5"/>
                    Generate
                </button>
            </div>
        </div>
    </div>
);

interface CreativeOptionsModalProps {
    topic: string;
    setTopic: (t: string) => void;
    audience: string;
    setAudience: (a: string) => void;
    style: string;
    setStyle: (s: string) => void;
    onClose: () => void;
    onCreate: () => void;
}

const CreativeOptionsModal: React.FC<CreativeOptionsModalProps> = ({ topic, setTopic, audience, setAudience, style, setStyle, onClose, onCreate }) => (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-fadeIn">
            <h2 className="text-2xl font-bold text-center mb-6 text-indigo-400">Creative Flipbook</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-slate-300 mb-2">Topic / Prompt</label>
                    <textarea
                        id="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. The life cycle of a butterfly, A guide to React hooks..."
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]"
                    />
                </div>
                <div>
                    <label htmlFor="audience" className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
                    <select
                        id="audience"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="Kids">Kids (5-10 years)</option>
                        <option value="Students">Students (High School/College)</option>
                        <option value="Professionals">Professionals</option>
                        <option value="General Public">General Public</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="style" className="block text-sm font-medium text-slate-300 mb-2">Style</label>
                    <select
                        id="style"
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="Storybook">Storybook</option>
                        <option value="Educational Guide">Educational Guide</option>
                        <option value="Technical Manual">Technical Manual</option>
                        <option value="Fun Facts">Fun Facts</option>
                    </select>
                </div>
            </div>
            <div className="mt-8 flex justify-between gap-4">
                 <button onClick={onClose} className="w-full px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition-colors duration-300">
                    Cancel
                </button>
                <button onClick={onCreate} disabled={!topic.trim()} className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/50 disabled:bg-slate-600 disabled:cursor-not-allowed">
                    <Icon icon="sparkles" className="w-5 h-5"/>
                    Create
                </button>
            </div>
        </div>
    </div>
);

interface VideoOptionsModalProps {
    videoFile: File;
    videoAspectRatio: '16:9' | '9:16';
    setVideoAspectRatio: (ratio: '16:9' | '9:16') => void;
    onClose: () => void;
    onAnimate: () => void;
}

const VideoOptionsModal: React.FC<VideoOptionsModalProps> = ({ videoFile, videoAspectRatio, setVideoAspectRatio, onClose, onAnimate }) => {
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
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg w-full shadow-2xl animate-fadeIn">
                <h2 className="text-2xl font-bold text-center mb-6 text-purple-400">Animate Your Image</h2>
                {previewUrl && <img src={previewUrl} alt="Image preview" className="w-full max-h-60 object-contain rounded-lg mb-6 shadow-md"/>}
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
                            Note: Video generation can take several minutes and requires a key from a paid GCP project. See <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-400">billing info</a>.
                         </p>
                    </div>
                </div>
                <div className="mt-8 flex justify-between gap-4">
                     <button onClick={onClose} className="w-full px-6 py-3 bg-slate-600 hover:bg-slate-500 rounded-lg font-semibold transition-colors duration-300">
                        Cancel
                    </button>
                    <button onClick={onAnimate} className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50">
                        <Icon icon="movie" className="w-5 h-5"/>
                        Animate
                    </button>
                </div>
            </div>
        </div>
    );
};

interface VideoPlayerModalProps {
    videoUrl: string;
    onClose: () => void;
}
  
const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ videoUrl, onClose }) => (
     <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-3xl w-full flex flex-col gap-4 shadow-2xl animate-fadeIn">
            <h2 className="text-2xl font-bold text-center text-purple-400">Your Animation is Ready!</h2>
            <video src={videoUrl} controls autoPlay loop className="w-full rounded-lg bg-black shadow-lg" />
            <div className="flex justify-center gap-4">
                <a 
                    href={videoUrl} 
                    download={`animated_video_${Date.now()}.mp4`}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2 transition-colors shadow-lg"
                >
                    <Icon icon="download" /> Download
                </a>
                <button onClick={onClose} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow-lg">Close</button>
            </div>
        </div>
    </div>
);


// --- Main App Component ---

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [view, setView] = useState<AppView>('home');
  const [pages, setPages] = useState<FlipbookPage[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Flipbook state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [explanationStyle, setExplanationStyle] = useState<ExplanationStyle>('detailed');
  const [coverTheme, setCoverTheme] = useState<CoverTheme>('abstract');

  // Creative Flipbook state
  const [showCreativeModal, setShowCreativeModal] = useState(false);
  const [creativeTopic, setCreativeTopic] = useState('');
  const [creativeAudience, setCreativeAudience] = useState('Kids');
  const [creativeStyle, setCreativeStyle] = useState('Storybook');

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [showVideoOptionsModal, setShowVideoOptionsModal] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const storedKey = sessionStorage.getItem('gemini-api-key');
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  const handleKeySubmit = (key: string) => {
    sessionStorage.setItem('gemini-api-key', key);
    setApiKey(key);
  };

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

  const handleUpdatePage = useCallback((index: number, updatedPage: FlipbookPage | ((page: FlipbookPage) => FlipbookPage)) => {
      setPages(prevPages => {
          const newPages = [...prevPages];
          if (index < 0 || index >= newPages.length) return prevPages;

          const oldPage = newPages[index];
          const newPage = typeof updatedPage === 'function' 
            ? (updatedPage as (p: FlipbookPage) => FlipbookPage)(oldPage) 
            : updatedPage;
            
          newPages[index] = newPage;
          return newPages;
      });
  }, []);

  const processPaper = useCallback(async () => {
    if (!selectedFile) return;

    setShowOptionsModal(false);
    setView('processing');
    setError(null);

    try {
      setLoadingMessage('Generating creative cover...');
      const coverPrompt = `${selectedFile.name.split('.')[0]}`;
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

  const processCreative = useCallback(async () => {
    setShowCreativeModal(false);
    setView('processing');
    setError(null);

    try {
        setLoadingMessage('Designing your book...');
        const coverPromise = generateCoverImage(creativeTopic, 'abstract'); // Abstract theme by default for creative
        const contentPromise = generateCreativeBook(creativeTopic, creativeAudience, creativeStyle);
        
        const [imageUrl, bookData] = await Promise.all([coverPromise, contentPromise]);

        setLoadingMessage('Finalizing pages...');
        const tocItems = bookData.pages.map(p => p.title);

        const generatedPages: FlipbookPage[] = [
            { type: 'cover', imageUrl, title: bookData.title },
            { type: 'toc', title: 'Table of Contents', items: tocItems }
        ];

        bookData.pages.forEach((p, index) => {
            generatedPages.push({
                type: 'story',
                title: p.title,
                content: p.content,
                illustrationPrompt: p.imagePrompt
            });
        });

        setPages(generatedPages);
        setView('flipbook');

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        setView('home');
    } finally {
        setLoadingMessage('');
    }
  }, [creativeTopic, creativeAudience, creativeStyle]);
  
  const processVideo = useCallback(async () => {
    if (!videoFile) return;

    setShowVideoOptionsModal(false);
    setView('processing');
    setError(null);
    setGeneratedVideoUrl(null);

    try {
        const videoUrl = await generateVideoFromImage(
            videoFile,
            videoAspectRatio,
            (progressMessage) => setLoadingMessage(progressMessage)
        );
        setGeneratedVideoUrl(videoUrl);
        setView('videoPlayer');
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
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
    setShowCreativeModal(false);
    setCreativeTopic('');
  };

  if (!apiKey) {
    return <ApiKeyModal onKeySubmit={handleKeySubmit} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4 md:p-8 flex flex-col">
      <div className="flex-grow">
        <header className="text-center mb-12 animate-slideDown">
            <div className="text-2xl font-bold text-amber-400 font-mono mb-4 tracking-wider">ICT cafe</div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            AI <span className="text-teal-400">Flipbook</span> Factory
            </h1>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto text-lg">
            Turn your documents and ideas into stunning, interactive flipbooks with the power of AI.
            </p>
        </header>
        
        {showOptionsModal && <OptionsModal 
          explanationStyle={explanationStyle}
          setExplanationStyle={setExplanationStyle}
          coverTheme={coverTheme}
          setCoverTheme={setCoverTheme}
          onClose={() => setShowOptionsModal(false)}
          onGenerate={processPaper}
        />}
        
        {showCreativeModal && <CreativeOptionsModal
            topic={creativeTopic}
            setTopic={setCreativeTopic}
            audience={creativeAudience}
            setAudience={setCreativeAudience}
            style={creativeStyle}
            setStyle={setCreativeStyle}
            onClose={() => setShowCreativeModal(false)}
            onCreate={processCreative}
        />}

        {showVideoOptionsModal && videoFile && <VideoOptionsModal 
          videoFile={videoFile}
          videoAspectRatio={videoAspectRatio}
          setVideoAspectRatio={setVideoAspectRatio}
          onClose={() => setShowVideoOptionsModal(false)}
          onAnimate={processVideo}
        />}

        {view === 'home' && (
            <main className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fadeIn">
                {error && <div className="md:col-span-2 lg:col-span-3 bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg text-center shadow-lg">{error}</div>}
                
                <Card
                    title="Papers Factory"
                    description="Upload a question paper, and our AI will generate answers, explanations, and a creative cover for a complete study guide flipbook."
                    icon={<Icon icon="book" className="w-8 h-8 text-teal-300"/>}
                >
                    <label htmlFor="paper-upload" className="w-full cursor-pointer mt-auto px-6 py-3 bg-teal-600 hover:bg-teal-500 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-teal-900/50">
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
                    <label htmlFor="video-upload" className="w-full cursor-pointer mt-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/50">
                        <Icon icon="upload"/>
                        Upload Image
                    </label>
                    <input id="video-upload" type="file" className="hidden" accept="image/*" onChange={handleVideoFileChange} />
                </Card>

                <Card
                    title="Creative Flipbook"
                    description="Create a flipbook from scratch! Enter a topic, choose a style, and let the AI write and illustrate a custom book for you."
                    icon={<Icon icon="sparkles" className="w-8 h-8 text-indigo-300"/>}
                >
                    <div className="w-full mt-auto flex flex-wrap gap-4 items-center justify-center text-slate-500 mb-4">
                        <Icon icon="document" className="w-7 h-7"/>
                        <Icon icon="image" className="w-7 h-7"/>
                    </div>
                    <button 
                        onClick={() => setShowCreativeModal(true)}
                        className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/50"
                    >
                        <Icon icon="sparkles" />
                        Create Now
                    </button>
                </Card>
            </main>
        )}
      </div>


      {view === 'processing' && <Loader message={loadingMessage} />}
      
      {view === 'flipbook' && <Flipbook pages={pages} onClose={resetApp} onUpdatePage={handleUpdatePage} />}
      
      {view === 'videoPlayer' && generatedVideoUrl && <VideoPlayerModal videoUrl={generatedVideoUrl} onClose={resetApp} />}
      
      <footer className="text-center text-xs text-slate-500 py-4 mt-8">
        <p>&copy; {new Date().getFullYear()} ICT Cafe. All rights reserved.</p>
        <p className="mt-1">Disclaimer: The content is AI-generated and we do not take any responsibility.</p>
      </footer>
    </div>
  );
};

export default App;
