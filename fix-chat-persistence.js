const fs = require('fs');

const filePath = 'app/chat/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Update loadChatSessions to filter localStorage
const oldLoadChatSessions = `    const loadChatSessions = async () => {
        try {
            const response = await fetch('/api/chat');
            const data = await response.json();
            setChatSessions(data.sessions || []);
        } catch (error) {
            console.error('Error loading chat sessions:', error);
        }
    };`;

const newLoadChatSessions = `    const loadChatSessions = async () => {
        try {
            const response = await fetch('/api/chat');
            const data = await response.json();
            
            // Get list of cleared session IDs from localStorage
            const clearedSessionIds = JSON.parse(localStorage.getItem('clearedChatSessions') || '[]');
            
            // Filter out cleared sessions
            const filteredSessions = (data.sessions || []).filter(
                (session: ChatSession) => !clearedSessionIds.includes(session.id)
            );
            
            setChatSessions(filteredSessions);
        } catch (error) {
            console.error('Error loading chat sessions:', error);
        }
    };`;

// Fix 2: Update handleClearAllChatHistory
const oldHandleClear = `    const handleClearAllChatHistory = () => {
        if (!confirm('Clear all chat history from this panel? Note: History remains preserved in the system for admin access.')) {
            return;
        }
        
        // Clear only client-side state - does NOT delete from database
        setChatSessions([]);
        setMessages([]);
        setSessionId(null);
        setChatHistoryMenuOpen(false);
        
        alert('Chat history cleared from panel (preserved in system)');
    };`;

const newHandleClear = `    const handleClearAllChatHistory = () => {
        if (!confirm('Clear all chat history?')) {
            return;
        }
        
        // Save current session IDs to localStorage so they stay hidden
        const sessionIds = chatSessions.map(s => s.id);
        localStorage.setItem('clearedChatSessions', JSON.stringify(sessionIds));
        
        // Clear only client-side state
        setChatSessions([]);
        setMessages([]);
        setSessionId(null);
        setChatHistoryMenuOpen(false);
    };`;

let newContent = content.replace(oldLoadChatSessions, newLoadChatSessions);
newContent = newContent.replace(oldHandleClear, newHandleClear);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('✅ Fixed chat history persistence issue!');
console.log('✅ Updated confirmation message to be shorter');
