const fs = require('fs');

const filePath = 'app/chat/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the handleClearAllChatHistory function
const oldFunction = `    const handleClearAllChatHistory = async () => {
        if (!confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
            return;
        }

        try {
            // Delete all chat sessions for the current user
            const deletePromises = chatSessions.map(s => 
                fetch(\`/api/chat-sessions/\${s.id}\`, { method: 'DELETE' })
            );
            
            await Promise.all(deletePromises);
            
            // Clear state
            setChatSessions([]);
            setMessages([]);
            setSessionId(null);
            setChatHistoryMenuOpen(false);
            
            alert('All chat history has been cleared.');
        } catch (error) {
            console.error('Error clearing chat history:', error);
            alert('Failed to clear chat history');
        }
    };`;

const newFunction = `    const handleClearAllChatHistory = () => {
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

content = content.replace(oldFunction, newFunction);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated handleClearAllChatHistory function');
