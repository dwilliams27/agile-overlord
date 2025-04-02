import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// Define types
export interface User {
  id: number;
  name: string;
  role: string;
  personality?: string;
  avatar?: string;
  isAI: boolean;
}

export interface Channel {
  id: number;
  name: string;
  description: string | null;
  isPrivate: boolean;
}

export interface Message {
  id: number;
  channelId: number;
  userId: number;
  content: string;
  threadParentId: number | null;
  createdAt: string;
  updatedAt: string;
  user?: User; // User object may be included in API responses
}

interface TeamChatContextType {
  currentUser: User | null;
  channels: Channel[];
  messages: Record<number, Message[]>; // Keyed by channel ID
  threadMessages: Record<number, Message[]>; // Keyed by parent message ID
  activeChannel: Channel | null;
  activeThread: Message | null;
  loadingChannels: boolean;
  loadingMessages: boolean;
  loadingThreadMessages: boolean;
  setCurrentUser: (user: User) => void;
  fetchChannels: () => Promise<void>;
  fetchMessages: (channelId: number) => Promise<void>;
  fetchThreadMessages: (messageId: number) => Promise<void>;
  setActiveChannel: (channel: Channel) => void;
  setActiveThread: (message: Message | null) => void;
  sendMessage: (content: string, channelId: number, threadParentId?: number) => Promise<void>;
}

// Create context
const TeamChatContext = createContext<TeamChatContextType | undefined>(undefined);

// Socket instance
let socket: Socket;

// Provider component
export const TeamChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Record<number, Message[]>>({});
  const [threadMessages, setThreadMessages] = useState<Record<number, Message[]>>({});
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [loadingThreadMessages, setLoadingThreadMessages] = useState<boolean>(false);
  
  // Initialize socket connection
  useEffect(() => {
    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');
    
    // Socket event listeners
    socket.on('message:new', handleNewMessage);
    socket.on('thread:new', handleNewThreadMessage);
    socket.on('channel:new', handleNewChannel);
    
    return () => {
      // Clean up socket connection
      socket.disconnect();
    };
  }, []);
  
  // Notify when active channel changes
  useEffect(() => {
    if (activeChannel) {
      // Join channel room
      socket.emit('channel:join', activeChannel.id);
      
      // Load messages for this channel
      fetchMessages(activeChannel.id);
    }
    
    return () => {
      if (activeChannel) {
        // Leave channel room when component unmounts or channel changes
        socket.emit('channel:leave', activeChannel.id);
      }
    };
  }, [activeChannel]);
  
  // Socket event handlers
  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prevMessages => {
      const channelMessages = [...(prevMessages[message.channelId] || [])];
      channelMessages.unshift(message); // Add to beginning of array
      
      return {
        ...prevMessages,
        [message.channelId]: channelMessages
      };
    });
  }, []);
  
  const handleNewThreadMessage = useCallback((message: Message & { parentMessageId: number }) => {
    if (!message.parentMessageId) return;
    
    setThreadMessages(prevThreadMessages => {
      const parentMessages = [...(prevThreadMessages[message.parentMessageId] || [])];
      parentMessages.push(message); // Add to end of array
      
      return {
        ...prevThreadMessages,
        [message.parentMessageId]: parentMessages
      };
    });
  }, []);
  
  const handleNewChannel = useCallback((channel: Channel) => {
    setChannels(prevChannels => [...prevChannels, channel]);
  }, []);
  
  // API URL
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  
  // API calls - memoized to prevent infinite rerenders
  const fetchChannels = useCallback(async () => {
    setLoadingChannels(true);
    try {
      const response = await axios.get(`${API_URL}/api/channels`);
      setChannels(response.data);
      
      // Set first channel as active if none is set
      if (response.data.length > 0 && !activeChannel) {
        setActiveChannel(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  }, [activeChannel, setActiveChannel]);
  
  const fetchMessages = useCallback(async (channelId: number) => {
    if (!channelId) return;
    
    setLoadingMessages(true);
    try {
      const response = await axios.get(`${API_URL}/api/channels/${channelId}/messages`);
      setMessages(prev => ({
        ...prev,
        [channelId]: response.data
      }));
    } catch (error) {
      console.error(`Error fetching messages for channel ${channelId}:`, error);
    } finally {
      setLoadingMessages(false);
    }
  }, []);
  
  const fetchThreadMessages = useCallback(async (messageId: number) => {
    if (!messageId) return;
    
    setLoadingThreadMessages(true);
    try {
      const response = await axios.get(`${API_URL}/api/messages/${messageId}/thread`);
      setThreadMessages(prev => ({
        ...prev,
        [messageId]: response.data
      }));
    } catch (error) {
      console.error(`Error fetching thread messages for message ${messageId}:`, error);
    } finally {
      setLoadingThreadMessages(false);
    }
  }, []);
  
  const sendMessage = useCallback(async (content: string, channelId: number, threadParentId?: number) => {
    if (!currentUser) return;
    
    try {
      if (threadParentId) {
        // Send thread message
        await axios.post(`${API_URL}/api/messages/${threadParentId}/thread`, {
          userId: currentUser.id,
          content
        });
        
        // Update thread messages
        fetchThreadMessages(threadParentId);
      } else {
        // Send channel message
        await axios.post(`${API_URL}/api/channels/${channelId}/messages`, {
          userId: currentUser.id,
          content
        });
        
        // Update channel messages
        fetchMessages(channelId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [currentUser, fetchMessages, fetchThreadMessages]);
  
  // Context value
  const value = {
    currentUser,
    channels,
    messages,
    threadMessages,
    activeChannel,
    activeThread,
    loadingChannels,
    loadingMessages,
    loadingThreadMessages,
    setCurrentUser,
    fetchChannels,
    fetchMessages,
    fetchThreadMessages,
    setActiveChannel,
    setActiveThread,
    sendMessage
  };
  
  return (
    <TeamChatContext.Provider value={value}>
      {children}
    </TeamChatContext.Provider>
  );
};

// Custom hook for using the context
export const useTeamChat = () => {
  const context = useContext(TeamChatContext);
  if (context === undefined) {
    throw new Error('useTeamChat must be used within a TeamChatProvider');
  }
  return context;
};