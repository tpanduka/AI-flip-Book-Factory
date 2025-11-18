import React from 'react';

interface LoaderProps {
  message: string;
  progress?: string;
}

const Loader: React.FC<LoaderProps> = ({ message, progress }) => {
  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-80 backdrop-blur-sm flex flex-col justify-center items-center z-50 text-white">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-400"></div>
      <p className="mt-4 text-lg font-semibold tracking-wider">{message}</p>
      {progress && <p className="mt-2 text-md text-slate-300">{progress}</p>}
    </div>
  );
};

export default Loader;
