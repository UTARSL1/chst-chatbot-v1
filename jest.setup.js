require('@testing-library/jest-dom');

// Mock next-auth
jest.mock('next-auth/react', () => ({
    useSession: jest.fn(() => ({
        data: { user: { id: '1', role: 'chairperson', name: 'Test User' } },
        status: 'authenticated',
    })),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    })),
    usePathname: jest.fn(() => '/admin/users'),
}));
