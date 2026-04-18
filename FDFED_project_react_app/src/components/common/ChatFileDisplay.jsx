import React from 'react';

const ChatFileDisplay = ({ fileUrl, fileName, senderType, isWhiteText = false }) => {
  const getFileType = (name) => {
    if (!name) return 'unknown';
    const ext = name.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'document';
    return 'file';
  };

  const fileType = getFileType(fileName);

  if (fileType === 'image') {
    return (
      <div className="max-w-xs">
        <img src={fileUrl} alt={fileName} className="rounded-lg max-h-64 max-w-full" />
        <p className={`text-xs mt-1 ${isWhiteText ? 'opacity-75' : 'opacity-75 text-slate-600'}`}>
          {fileName}
        </p>
      </div>
    );
  } else if (fileType === 'pdf') {
    return (
      <div className="flex flex-col gap-2">
        <a
          href={fileUrl}
          className={`inline-flex items-center gap-2 font-semibold hover:opacity-80 ${isWhiteText ? 'text-white' : 'text-blue-600'}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>📄 {fileName}</span>
        </a>
        <div className={`text-xs opacity-75 ${isWhiteText ? '' : 'text-slate-600'}`}>
          Click to view PDF
        </div>
      </div>
    );
  } else {
    return (
      <a
        href={fileUrl}
        className={`inline-flex items-center gap-2 font-semibold hover:opacity-80 ${isWhiteText ? 'text-white' : 'text-blue-600'}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span>📎 {fileName}</span>
      </a>
    );
  }
};

export default ChatFileDisplay;
