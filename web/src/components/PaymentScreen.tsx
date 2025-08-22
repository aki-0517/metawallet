import { useState, useEffect, useRef } from 'react';
import { createQR, encodeURL } from '@solana/pay';
import { Keypair, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';
import { useAuth } from '../contexts/AuthContext';

export function PaymentScreen() {
  const { solanaAddress } = useAuth();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const qrRef = useRef<HTMLDivElement>(null);

  const generateQRCode = () => {
    try {
      if (!solanaAddress) {
        setError('Solana wallet not connected');
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      setIsLoading(true);
      setError(null);

      const recipient = new PublicKey(solanaAddress);
      const paymentAmount = new BigNumber(amount);
      const reference = new Keypair().publicKey;
      const label = 'Metawallet Payment';
      const message = `Payment of ${amount} SOL`;
      const memo = `Metawallet payment: ${amount} SOL`;

      const url = encodeURL({
        recipient,
        amount: paymentAmount,
        reference,
        label,
        message,
        memo,
      });

      setQrUrl(url.toString());
      setShowQR(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showQR && qrUrl && qrRef.current) {
      qrRef.current.innerHTML = '';
      try {
        const qr = createQR(qrUrl, 300, 'white');
        qr.append(qrRef.current);
      } catch (err) {
        setError('Failed to create QR code');
      }
    }
  }, [showQR, qrUrl]);

  const closeQR = () => {
    setShowQR(false);
    setQrUrl('');
    setError(null);
    setAmount('');
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">💳 Solana Pay</h2>
        <p className="text-gray-300">Generate QR code for Solana Pay payments</p>
      </div>

      {!showQR ? (
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-auto">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (SOL)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-black bg-opacity-30 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:outline-none"
                step="0.001"
                min="0"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              onClick={generateQRCode}
              disabled={isLoading || !amount || parseFloat(amount) <= 0}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? 'Generating...' : 'Generate Payment QR'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-auto text-center">
          <h3 className="text-xl font-semibold text-white mb-4">
            Scan to Pay {amount} SOL
          </h3>
          
          <div className="bg-white rounded-lg p-4 mb-6 inline-block">
            <div ref={qrRef} className="flex justify-center"></div>
          </div>

          <p className="text-gray-300 text-sm mb-6">
            Scan this QR code with any Solana wallet to send payment
          </p>

          <div className="space-y-3">
            <button
              onClick={closeQR}
              className="w-full py-2 px-6 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Generate New Payment
            </button>
          </div>
        </div>
      )}

      {/* Payment Instructions */}
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <span className="mr-2">ℹ️</span>
          How to Use Solana Pay
        </h3>
        <div className="space-y-3 text-gray-300 text-sm">
          <p>• Generate a QR code by entering the amount you want to receive</p>
          <p>• Share the QR code with the person who will pay you</p>
          <p>• They can scan it with any Solana wallet (Phantom, Solflare, etc.)</p>
          <p>• The payment will be sent directly to your Solana address</p>
          <p>• No intermediaries or additional fees required</p>
        </div>
      </div>
    </div>
  );
}