import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import { Bot, User, AlertCircle } from 'lucide-react';

interface Props {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<Props> = ({ message }) => {
  const isModel = message.role === 'model';
  const isSystem = message.role === 'system'; // Used for internal status messages

  if (isSystem) {
    return (
      <div className="flex justify-center my-4 animate-fade-in">
        <span className="px-3 py-1 bg-slate-800 text-slate-400 text-xs rounded-full border border-slate-700">
          {message.text}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-4 animate-fade-in ${isModel ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isModel ? 'flex-row' : 'flex-row-reverse'} gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
          message.isError ? 'bg-red-900/30 text-red-400' : 
          isModel ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {message.isError ? <AlertCircle size={16} /> : isModel ? <Bot size={18} /> : <User size={18} />}
        </div>

        {/* Bubble */}
        <div className={`p-3 rounded-2xl shadow-sm whitespace-pre-wrap leading-relaxed text-sm md:text-base ${
          message.isError 
            ? 'bg-red-900/20 border border-red-800 text-red-200' 
            : isModel 
              ? 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none' 
              : 'bg-blue-600 text-white rounded-tr-none'
        }`}>
          {message.text}
        </div>
      </div>
    </div>
  );
};