import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { marked } from 'marked';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedRole = searchParams.get('role');

    // Validate role parameter
    if (!requestedRole || !['public', 'student', 'member', 'chairperson'].includes(requestedRole)) {
      return NextResponse.json(
        { error: 'Invalid role parameter' },
        { status: 400 }
      );
    }

    // For public manual, allow unauthenticated access
    if (requestedRole !== 'public') {
      // For other roles, require authentication
      const session = await getServerSession(authOptions);

      if (!session || !session.user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const user = session.user;

      // Ensure user can only access their own role's manual
      // (chairperson can access all manuals for review purposes)
      if (user.role !== requestedRole && user.role !== 'chairperson') {
        return NextResponse.json(
          { error: 'Forbidden: You can only access your role\'s manual' },
          { status: 403 }
        );
      }
    }

    // Map role to filename
    const roleToFilename: Record<string, string> = {
      public: 'public-user-manual.md',
      student: 'student-user-manual.md',
      member: 'member-user-manual.md',
      chairperson: 'admin-user-manual.md',
    };

    const filename = roleToFilename[requestedRole];
    const filePath = join(process.cwd(), 'public', 'manuals', filename);

    // Read the manual file
    const markdownContent = await readFile(filePath, 'utf-8');

    // Convert markdown to HTML for PDF generation
    const htmlContent = await marked(markdownContent);

    // Create HTML document with styling for PDF
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CHST AI Agent - ${requestedRole.charAt(0).toUpperCase() + requestedRole.slice(1)} User Manual</title>
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    h1 {
      color: #1e40af;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
      margin-top: 30px;
    }
    
    h2 {
      color: #1e40af;
      border-bottom: 2px solid #93c5fd;
      padding-bottom: 8px;
      margin-top: 25px;
    }
    
    h3 {
      color: #2563eb;
      margin-top: 20px;
    }
    
    h4 {
      color: #3b82f6;
      margin-top: 15px;
    }
    
    code {
      background-color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    pre {
      background-color: #f3f4f6;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border-left: 4px solid #3b82f6;
    }
    
    pre code {
      background-color: transparent;
      padding: 0;
    }
    
    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 15px;
      margin-left: 0;
      color: #555;
      font-style: italic;
    }
    
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 15px 0;
    }
    
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    
    th {
      background-color: #3b82f6;
      color: white;
      font-weight: bold;
    }
    
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    ul, ol {
      margin: 10px 0;
      padding-left: 30px;
    }
    
    li {
      margin: 5px 0;
    }
    
    a {
      color: #2563eb;
      text-decoration: none;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    .page-break {
      page-break-after: always;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      h1, h2, h3 {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
    `;

    // Return HTML with appropriate headers for download
    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Content-Disposition', `attachment; filename="CHST-AI-Agent-${requestedRole}-Manual.html"`);

    return new NextResponse(fullHtml, {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Error generating manual download:', error);

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Manual not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
