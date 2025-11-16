import { SignIn } from "@clerk/clerk-react";

const ClerkSignIn = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>
      
      <div className="w-full max-w-md">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/custom-sign-up"
          redirectUrl="/"
          appearance={{
            baseTheme: 'light', // Force light theme
            variables: {
              colorBackground: '#ffffff',
              colorText: '#1f2937',
              colorPrimary: '#2563eb',
              colorInputBackground: '#ffffff',
              colorInputText: '#1f2937',
            },
            elements: {
              rootBox: 'w-full mx-auto',
              card: 'bg-white shadow-2xl rounded-3xl border-0',
              headerTitle: 'text-2xl font-bold text-gray-900 text-center',
              headerSubtitle: 'text-gray-600 text-center',
              socialButtonsBlockButton: 
                'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-xl mb-3',
              socialButtonsBlockButtonText: 'text-gray-700 font-medium',
              formFieldLabel: 'text-gray-700 font-semibold text-sm',
              formFieldInput: 
                'bg-white border border-gray-300 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              formButtonPrimary: 
                'bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl',
              footerActionLink: 'text-blue-600 hover:text-blue-700 font-semibold',
              dividerLine: 'bg-gray-200',
              dividerText: 'text-gray-500 bg-white',
            }
          }}
        />
      </div>
    </div>
  );
};

export default ClerkSignIn;