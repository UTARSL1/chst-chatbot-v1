const fs = require('fs');

const filePath = 'app/chat/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add the chatHistoryMenuOpen state variable
const stateSection = `    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);`;

const newStateSection = `    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [chatHistoryMenuOpen, setChatHistoryMenuOpen] = useState(false);`;

content = content.replace(stateSection, newStateSection);

// 2. Add the handleClearAllChatHistory function after handleNewChat
const afterNewChat = `    const handleNewChat = () => {
        setMessages([]);
        setSessionId(null);
    };

    const getRoleBadgeClass`;

const withClearFunction = `    const handleNewChat = () => {
        setMessages([]);
        setSessionId(null);
    };

    const handleClearAllChatHistory = () => {
        if (!confirm('Clear all chat history from this panel? Note: History remains preserved in the system for admin access.')) {
            return;
        }
        
        // Clear only client-side state - does NOT delete from database
        setChatSessions([]);
        setMessages([]);
        setSessionId(null);
        setChatHistoryMenuOpen(false);
        
        alert('Chat history cleared from panel (preserved in system)');
    };

    const getRoleBadgeClass`;

content = content.replace(afterNewChat, withClearFunction);

// 3. Replace the Chat History header section in the UI
const oldHeader = `                    <div className="flex-1 overflow-y-auto space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Chat History</h3>
                        {chatSessions.map((s) => (`;

const newHeader = `                    <div className="flex-1 overflow-y-auto space-y-2">
                        {/* Chat History Header with 3-dot Menu */}
                        <div className="group relative flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-muted-foreground">Chat History</h3>
                            
                            {/* Three-dot Menu Button - Visible on Hover */}
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setChatHistoryMenuOpen(!chatHistoryMenuOpen);
                                    }}
                                    className={\`p-1.5 rounded-md hover:bg-background transition-opacity \${chatHistoryMenuOpen ? 'opacity-100 bg-background' : 'opacity-0 group-hover:opacity-100'}\`}
                                    title="Chat History Options"
                                >
                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </button>

                                {/* Dropdown Menu */}
                                {chatHistoryMenuOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={(e) => { e.stopPropagation(); setChatHistoryMenuOpen(false); }}
                                        />
                                        <div className="absolute right-0 top-8 w-48 bg-popover border border-border rounded-md shadow-md z-50 py-1 bg-card">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setChatHistoryMenuOpen(false);
                                                    handleClearAllChatHistory();
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-red-500 flex items-center gap-2"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Clear all Chat History
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {chatSessions.map((s) => (`;

content = content.replace(oldHeader, newHeader);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully implemented clear chat history feature!');
console.log('✓ Added chatHistoryMenuOpen state');
console.log('✓ Added handleClearAllChatHistory function (client-side only)');
console.log('✓ Added three-dot menu with hover effect');
console.log('✓ Chat history preserved in database for admin access');
