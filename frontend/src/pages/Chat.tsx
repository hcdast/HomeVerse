import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { useChat, Message } from '../hooks/useChat';
import './Chat.css';

const Chat = () => {
  const { user } = useAuthStore();
  const {
    isConnected,
    messages,
    typingUsers,
    onlineMembers,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    deleteMessage,
    loadMessages,
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 常用表情
  const emojis = ['😀', '😂', '🥰', '😍', '🤔', '😅', '😊', '👍', '❤️', '🎉', '🔥', '💪', '👏', '🙏', '💯', '✨'];

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 加载更多消息
  const handleLoadMore = async () => {
    if (messages.length === 0 || isLoading) return;
    setIsLoading(true);
    await loadMessages(messages[0]._id);
    setIsLoading(false);
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || !isConnected) return;

    try {
      await sendMessage({
        content: inputValue.trim(),
        type: 'text',
        replyTo: replyTo?._id,
      });
      setInputValue('');
      setReplyTo(null);
      stopTyping();
      scrollToBottom();
    } catch (error) {
      console.error('发送失败:', error);
    }
  };

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    startTyping();
  };

  // 添加表情
  const handleEmojiClick = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
    setShowEmojiPicker(false);
  };

  // 删除消息
  const handleDelete = async (messageId: string) => {
    if (confirm('确定要删除这条消息吗？')) {
      try {
        await deleteMessage(messageId);
      } catch (error) {
        console.error('删除失败:', error);
      }
    }
  };

  // 标记已读
  useEffect(() => {
    const unreadIds = messages
      .filter(m => !m.readBy.includes(user?._id || '') && m.senderId !== user?._id)
      .map(m => m._id);
    if (unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  }, [messages, user?._id, markAsRead]);

  // 新消息滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 消息分组（按日期）
  const groupedMessages = messages.reduce((groups: { date: string; messages: Message[] }[], message) => {
    const date = new Date(message.createdAt).toLocaleDateString('zh-CN');
    const lastGroup = groups[groups.length - 1];
    
    if (lastGroup && lastGroup.date === date) {
      lastGroup.messages.push(message);
    } else {
      groups.push({ date, messages: [message] });
    }
    return groups;
  }, []);

  return (
    <div className="chat-page">
      {/* 头部 */}
      <div className="chat-header">
        <div className="chat-header-left">
          <span className="chat-icon">💬</span>
          <div className="chat-info">
            <h1>家庭聊天室</h1>
            <span className="online-status">
              {isConnected ? (
                <>
                  <span className="status-dot online" />
                  {onlineMembers.length} 人在线
                </>
              ) : (
                <>
                  <span className="status-dot offline" />
                  未连接
                </>
              )}
            </span>
          </div>
        </div>
        <div className="chat-header-right">
          {onlineMembers.slice(0, 5).map((member, index) => (
            <div
              key={member.userId}
              className="online-avatar"
              title={member.userName}
              style={{ zIndex: 5 - index }}
            >
              {member.userName.charAt(0).toUpperCase()}
            </div>
          ))}
          {onlineMembers.length > 5 && (
            <div className="online-avatar more">+{onlineMembers.length - 5}</div>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <div className="messages-container" ref={messagesContainerRef}>
        {messages.length > 0 && (
          <button className="load-more-btn" onClick={handleLoadMore} disabled={isLoading}>
            {isLoading ? '加载中...' : '加载更多消息'}
          </button>
        )}

        {groupedMessages.map((group) => (
          <div key={group.date} className="message-group">
            <div className="date-divider">
              <span>{group.date}</span>
            </div>
            {group.messages.map((message) => {
              const isOwn = message.senderId === user?._id;
              const senderName = message.senderName || '用户';
              const senderInitial = senderName.charAt(0).toUpperCase();
              return (
                <div
                  key={message._id}
                  className={`message-item ${isOwn ? 'own' : ''} ${message.isDeleted ? 'deleted' : ''}`}
                >
                  {!isOwn && (
                    <div className="message-avatar">
                      {message.senderAvatar ? (
                        <img src={message.senderAvatar} alt={senderName} />
                      ) : (
                        senderInitial
                      )}
                    </div>
                  )}
                  <div className="message-content-wrapper">
                    {!isOwn && (
                      <span className="message-sender">{senderName}</span>
                    )}
                    {message.replyTo && (
                      <div className="message-reply-preview">
                        <span className="reply-author">{(message.replyTo as any).senderName || '用户'}</span>
                        <span className="reply-text">{(message.replyTo as any).content}</span>
                      </div>
                    )}
                    <div className="message-bubble">
                      {message.type === 'image' && message.fileUrl && (
                        <img src={message.fileUrl} alt="图片" className="message-image" />
                      )}
                      <p className="message-text">{message.content}</p>
                      <span className="message-time">{formatTime(message.createdAt)}</span>
                    </div>
                    <div className="message-actions">
                      {!message.isDeleted && (
                        <>
                          <button onClick={() => setReplyTo(message)} title="回复">
                            ↩️
                          </button>
                          {isOwn && (
                            <button onClick={() => handleDelete(message._id)} title="删除">
                              🗑️
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* 正在输入提示 */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <span className="typing-dots">
              <span></span><span></span><span></span>
            </span>
            {typingUsers.map(u => u.userName).join(', ')} 正在输入...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="chat-input-area">
        {replyTo && (
          <div className="reply-preview">
            <span>回复 {replyTo.senderName || '用户'}: {replyTo.content.substring(0, 50)}...</span>
            <button onClick={() => setReplyTo(null)}>×</button>
          </div>
        )}
        <div className="input-wrapper">
          <button
            className="emoji-btn"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😊
          </button>
          {showEmojiPicker && (
            <div className="emoji-picker">
              {emojis.map(emoji => (
                <button key={emoji} onClick={() => handleEmojiClick(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? '输入消息...' : '连接中...'}
            disabled={!isConnected}
            rows={1}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || !isConnected}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;



