// Add this new component
// components/SignUpRedirect.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignIn, useUser } from '@clerk/clerk-react';

const SignUpRedirect = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  useEffect(() => {
    // If user is already signed in, redirect to dashboard
    if (isSignedIn) {
      navigate('/');
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-white dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <SignIn />
      </div>
    </div>
  );
};

export default SignUpRedirect;