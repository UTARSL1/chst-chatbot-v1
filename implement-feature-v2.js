const fs = require('fs');

const filePath = 'app/chat/page.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

let newLines = [];
let i = 0;

while (i < lines.length) {
    // 1. Add chatHistoryMenuOpen state
    if (lines[i].includes('const [menuOpenId, setMenuOpenId]')) {
        newLines.push(lines[i]);
        newLines.push('    const [chatHistoryMenuOpen, setChatHistoryMenuOpen] = useState(false);');
        i++;
        continue;
    }

    // 2. Add handleClearAllChatHistory after handleNewChat
    if (lines[i].includes('const handleNewChat = () => {')) {
        // Add handleNewChat
        newLines.push(lines[i]); i++;
        newLines.push(lines[i]); i++;  // setMessages
        newLines.push(lines[i]); i++;  // setSessionId
        newLines.push(lines[i]); i++;  // closing brace

        // Add new function
        newLines.push('');
        newLines.push('    const handleClearAllChatHistory = () => {');
        newLines.push('        if (!confirm(\'Clear all chat history from this panel? Note: History remains preserved in the system for admin access.\')) {');
        newLines.push('            return;');
        newLines.push('        }');
        newLines.push('        ');
        newLines.push('        // Clear only client-side state - does NOT delete from database');
        newLines.push('        setChatSessions([]);');
        newLines.push('        setMessages([]);');
        newLines.push('        setSessionId(null);');
        newLines.push('        setChatHistoryMenuOpen(false);');
        newLines.push('        ');
        newLines.push('        alert(\'Chat history cleared from panel (preserved in system)\');');
        newLines.push('    };');
        continue;
    }

    // 3. Replace Chat History header
    if (lines[i].includes('<h3 className="text-sm font-semibold text-muted-foreground mb-2">Chat History</h3>')) {
        newLines.push('                        {/* Chat History Header with 3-dot Menu */}');
        newLines.push('                        <div className="group relative flex items-center justify-between mb-2">');
        newLines.push('                            <h3 className="text-sm font-semibold text-muted-foreground">Chat History</h3>');
        newLines.push('                            ');
        newLines.push('                            {/* Three-dot Menu Button - Visible on Hover */}');
        newLines.push('                            <div className="relative">');
        newLines.push('                                <button');
        newLines.push('                                    onClick={(e) => {');
        newLines.push('                                        e.stopPropagation();');
        newLines.push('                                        setChatHistoryMenuOpen(!chatHistoryMenuOpen);');
        newLines.push('                                    }}');
        newLines.push('                                    className={`p-1.5 rounded-md hover:bg-background transition-opacity ${chatHistoryMenuOpen ? \'opacity-100 bg-background\' : \'opacity-0 group-hover:opacity-100\'}`}');
        newLines.push('                                    title="Chat History Options"');
        newLines.push('                                >');
        newLines.push('                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />');
        newLines.push('                                </button>');
        newLines.push('');
        newLines.push('                                {/* Dropdown Menu */}');
        newLines.push('                                {chatHistoryMenuOpen && (');
        newLines.push('                                    <>');
        newLines.push('                                        <div');
        newLines.push('                                            className="fixed inset-0 z-40"');
        newLines.push('                                            onClick={(e) => { e.stopPropagation(); setChatHistoryMenuOpen(false); }}');
        newLines.push('                                        />');
        newLines.push('                                        <div className="absolute right-0 top-8 w-48 bg-popover border border-border rounded-md shadow-md z-50 py-1 bg-card">');
        newLines.push('                                            <button');
        newLines.push('                                                onClick={(e) => {');
        newLines.push('                                                    e.stopPropagation();');
        newLines.push('                                                    setChatHistoryMenuOpen(false);');
        newLines.push('                                                    handleClearAllChatHistory();');
        newLines.push('                                                }}');
        newLines.push('                                                className="w-full text-left px-3 py-2 text-xs hover:bg-red-500/10 text-red-500 flex items-center gap-2"');
        newLines.push('                                            >');
        newLines.push('                                                <Trash2 className="w-3 h-3" />');
        newLines.push('                                                Clear all Chat History');
        newLines.push('                                            </button>');
        newLines.push('                                        </div>');
        newLines.push('                                    </>');
        newLines.push('                                )}');
        newLines.push('                            </div>');
        newLines.push('                        </div>');
        newLines.push('');
        i++;
        continue;
    }

    newLines.push(lines[i]);
    i++;
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('✅ Successfully implemented clear chat history feature!');
