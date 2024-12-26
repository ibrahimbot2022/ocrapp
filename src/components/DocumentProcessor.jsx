import { useState } from 'react';
import { Upload, FileText, Send, Download, Loader } from 'lucide-react';
import { Alert, AlertDescription } from '@chakra-ui/react';
import Tesseract from 'tesseract.js';

const DocumentProcessor = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [exportFormat, setExportFormat] = useState('json');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.includes('image/')) {
      setError('Please upload an image file');
      return;
    }

    setFile(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const parseText = (text) => {
    // Regex patterns for extracting the relevant information
    const vendorNamePattern = /(?:Sweetgreen|[\w\s]+)(?=\s*\d)/;
    const addressPattern = /(?:\d{1,5}\s[\w\s]+(?:Ave|Street|Road|Blvd|St)\s?[\w\s,]+(?:NY|NYC|USA)?)/;
    const amountPattern = /\$\d+\.\d+/;
    const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/;
    const orderDetailsPattern = /(\d+\s[\w\s]+)\s(\$\d+\.\d{2})/g;
    const invoicePattern = /Invoice\sNumber:\s?(\d+)/;
    const paymentMethodPattern = /(Cash|Credit\sCard|Debit\sCard|PayPal|Other)/;
    const taxAmountPattern = /Tax\s?(\$\d+\.\d{2})/;
    const storeInfoPattern = /Store\sName:\s?([\w\s]+)/;

    // Extract vendor name, address, amount, and date using regex
    const vendorName = text.match(vendorNamePattern)?.[0] || 'Unknown Vendor';
    const address = text.match(addressPattern)?.[0] || 'Unknown Address';
    const amount = text.match(amountPattern)?.[0] || 'N/A';
    const date = text.match(datePattern)?.[0] || 'Unknown Date';
    const invoiceNumber = text.match(invoicePattern)?.[1] || 'Unknown Invoice';
    const paymentMethod = text.match(paymentMethodPattern)?.[0] || 'Unknown Payment Method';
    const taxAmount = text.match(taxAmountPattern)?.[1] || 'N/A';
    const storeName = text.match(storeInfoPattern)?.[1] || 'Unknown Store';

    // Extract order items (name and price)
    const orderDetails = [];
    let match;
    while ((match = orderDetailsPattern.exec(text)) !== null) {
      orderDetails.push({ item: match[1], price: match[2] });
    }

    return {
      vendorName,
      address,
      amount,
      date,
      invoiceNumber,
      paymentMethod,
      taxAmount,
      storeName,
      orderDetails,
      extractedText: text,
    };
  };

  const processImage = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setError('');

      // Use Tesseract.js to extract text from the image
      const { data: { text } } = await Tesseract.recognize(
        file,
        'eng', // Language code for English
        {
          logger: (m) => console.log(m), // Log progress
        }
      );

      const parsedData = parseText(text);
      setExtractedData(parsedData);
    } catch (err) {
      setError('Error processing image: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const exportData = () => {
    if (!extractedData) return;

    let content;
    let mimeType;
    let fileExtension;

    switch (exportFormat) {
      case 'json':
        content = JSON.stringify(extractedData, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      case 'csv':
        content = Object.entries(extractedData)
          .map(([key, value]) => `${key},${value}`).join('\n');
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;
      default:
        return;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `extracted_data.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareData = async () => {
    if (!extractedData) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Extracted Document Data',
          text: JSON.stringify(extractedData, null, 2),
        });
      } else {
        // Fallback for browsers that don't support the Web Share API
        const textArea = document.createElement('textarea');
        textArea.value = JSON.stringify(extractedData, null, 2);
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Data copied to clipboard!');
      }
    } catch (err) {
      setError('Error sharing data: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* File Upload Section */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center relative flex flex-col justify-center items-center">
          <input
            type="file"
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center space-y-2"
          >
            <Upload className="h-12 w-12 text-gray-400" />
            <span className="text-sm text-gray-500">
              Click to upload or drag and drop
            </span>
          </label>
          {preview && (
            <div className="w-full h-64 overflow-hidden relative mb-4">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
          )}
          {/* Centered Processing Button */}
          {!isProcessing && !extractedData && (
            <button
              onClick={processImage}
              className="absolute inset-0 m-auto bg-blue-600 text-white rounded-lg py-2 px-4 flex items-center justify-center space-x-2"
            >
              <FileText className="h-5 w-5" />
              <span>Process Image</span>
            </button>
          )}
          {isProcessing && (
            <div className="absolute inset-0 m-auto flex items-center justify-center">
              <Loader className="animate-spin h-8 w-8 text-white" />
              <span className="text-white ml-2">Processing...</span>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Section */}
        {extractedData && (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-semibold">Extracted Information</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <table className="table-auto w-full border-collapse border border-gray-400">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left border border-gray-300">Field</th>
                    <th className="px-4 py-2 text-left border border-gray-300">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300">Vendor Name</td>
                    <td className="px-4 py-2 border border-gray-300">{extractedData.vendorName}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300">Address</td>
                    <td className="px-4 py-2 border border-gray-300">{extractedData.address}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300">Amount</td>
                    <td className="px-4 py-2 border border-gray-300">{extractedData.amount}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300">Date</td>
                    <td className="px-4 py-2 border border-gray-300">{extractedData.date}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300">Invoice Number</td>
                    <td className="px-4 py-2 border border-gray-300">{extractedData.invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300">Payment Method</td>
                    <td className="px-4 py-2 border border-gray-300">{extractedData.paymentMethod}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300">Tax Amount</td>
                    <td className="px-4 py-2 border border-gray-300">{extractedData.taxAmount}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border border-gray-300">Store Name</td>
                    <td className="px-4 py-2 border border-gray-300">{extractedData.storeName}</td>
                  </tr>
                </tbody>
              </table>

              <h3 className="text-lg font-semibold mt-4">Order Details</h3>
              <table className="table-auto w-full border-collapse border border-gray-400">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left border border-gray-300">Item</th>
                    <th className="px-4 py-2 text-left border border-gray-300">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.orderDetails.map((order, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 border border-gray-300">{order.item}</td>
                      <td className="px-4 py-2 border border-gray-300">{order.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Export Options */}
            <div className="flex justify-center space-x-4 items-center">
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
                className="border rounded-lg px-3 py-2"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <button
                onClick={exportData}
                className="flex items-center space-x-2 bg-green-600 text-white
                         px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Download className="h-5 w-5" />
                <span>Export</span>
              </button>
              <button
                onClick={shareData}
                className="flex items-center space-x-2 bg-blue-600 text-white
                         px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                <Send className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentProcessor;

