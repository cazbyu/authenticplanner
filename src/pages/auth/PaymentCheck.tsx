import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import logo from '../../assets/logo.svg';

const PaymentCheck: React.FC = () => {
  const { user, checkPaymentStatus, isLoading } = useAuth();
  const [checkComplete, setCheckComplete] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const navigate = useNavigate();
  
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const isVerified = await checkPaymentStatus();
        setPaymentVerified(isVerified);
        setCheckComplete(true);
        
        if (isVerified) {
          // Navigate to onboarding or dashboard based on onboarding status
          setTimeout(() => {
            if (user?.onboardingComplete) {
              navigate('/');
            } else {
              navigate('/onboarding/welcome');
            }
          }, 2000);
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setCheckComplete(true);
      }
    };
    
    if (user) {
      verifyPayment();
    }
  }, [user, checkPaymentStatus, navigate]);
  
  const retryVerification = async () => {
    setCheckComplete(false);
    try {
      const isVerified = await checkPaymentStatus();
      setPaymentVerified(isVerified);
      
      if (isVerified) {
        // Navigate to onboarding or dashboard based on onboarding status
        if (user?.onboardingComplete) {
          navigate('/');
        } else {
          navigate('/onboarding/welcome');
        }
      }
    } catch (error) {
      console.error('Payment verification error:', error);
    } finally {
      setCheckComplete(true);
    }
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="text-center">
          <img src={logo} alt="Authentic Planner" className="mx-auto h-16 w-16" />
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Payment Verification
          </h2>
        </div>
        
        <div className="mt-8 rounded-lg bg-white p-6 shadow-sm sm:p-8">
          {isLoading || !checkComplete ? (
            <div className="text-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100"
              >
                <div className="h-8 w-8 rounded-full border-4 border-primary-500 border-r-transparent"></div>
              </motion.div>
              <p className="mt-4 text-lg font-medium text-gray-900">Verifying payment...</p>
              <p className="mt-2 text-sm text-gray-600">
                We're checking your Skool membership status.
              </p>
            </div>
          ) : paymentVerified ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="mt-4 text-lg font-medium text-gray-900">Payment verified!</p>
              <p className="mt-2 text-sm text-gray-600">
                Your Skool membership has been confirmed. Redirecting you to the application...
              </p>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <p className="mt-4 text-lg font-medium text-gray-900">Payment verification failed</p>
              <p className="mt-2 text-sm text-gray-600">
                We couldn't verify your Skool membership. Please make sure you've completed your payment.
              </p>
              <div className="mt-6 flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
                <button
                  onClick={retryVerification}
                  className="btn-primary flex-1"
                >
                  Retry Verification
                </button>
                <a
                  href="https://example.com/skool-payment" 
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline flex-1"
                >
                  Make Payment
                </a>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCheck;