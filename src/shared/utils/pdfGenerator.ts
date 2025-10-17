import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

interface SignatureData {
  paths: string[];
  timestamp: string;
  dimensions: { width: number; height: number };
}

interface PatientInfo {
  name: string;
  dateOfBirth: string;
  patientId: string;
}

export const generateConsentPDF = async (
  signatureData: SignatureData,
  patientInfo: PatientInfo
): Promise<string> => {
  try {
    // Convert signature paths to SVG
    const signatureSVG = generateSignatureSVG(signatureData);
    
    // Generate HTML content
    const htmlContent = generateConsentHTML(signatureSVG, patientInfo, signatureData.timestamp, signatureData);
    
    // Create PDF file path
    const fileName = `consent_${patientInfo.patientId}_${new Date().getTime()}.pdf`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    
    // For now, we'll save as HTML and share it
    // In a real implementation, you'd use a PDF generation service or library
    const htmlFilePath = `${FileSystem.documentDirectory}${fileName.replace('.pdf', '.html')}`;
    
    await FileSystem.writeAsStringAsync(htmlFilePath, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    return htmlFilePath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate consent document');
  }
};

const generateSignatureSVG = (signatureData: SignatureData): string => {
  const { paths, dimensions } = signatureData;
  
  // Ensure paths is always an array
  const safePaths = Array.isArray(paths) ? paths : [];
  
  // Join all path segments into one continuous 'd' attribute string.
  // This is a more robust way to render complex SVGs.
  const combinedPathData = safePaths.join(' ');

  if (!combinedPathData) {
    return `
      <div style="width:${dimensions.width}px; height:${dimensions.height}px; border:1px dashed #ccc; text-align:center; line-height:${dimensions.height}px; color:#ccc;">
        Signature not provided
      </div>
    `;
  }

  // The viewBox is essential for the SVG to scale correctly.
  const viewBox = `0 0 ${dimensions.width} ${dimensions.height}`;

  return `
    <svg 
      width="${dimensions.width}" 
      height="${dimensions.height}" 
      viewBox="${viewBox}" 
      xmlns="http://www.w3.org/2000/svg"
      style="border: 1px solid #E5E7EB; background-color: white;"
    >
      <path 
        d="${combinedPathData}" 
        stroke="#2563EB" 
        stroke-width="3" 
        fill="none" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      />
    </svg>
  `;
};

const generateConsentHTML = (
  signatureSVG: string,
  patientInfo: PatientInfo,
  timestamp: string,
  signatureData: SignatureData
): string => {
  const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Digital Consent Agreement</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #1F2937;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px 20px;
          background-color: #F8FAFC;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #E5E7EB;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2563EB;
          margin-bottom: 10px;
        }
        .title {
          font-size: 28px;
          font-weight: bold;
          color: #1F2937;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 16px;
          color: #6B7280;
        }
        .patient-info {
          background-color: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 1px solid #E5E7EB;
        }
        .patient-info h3 {
          margin: 0 0 15px 0;
          color: #2563EB;
          font-size: 18px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 5px;
        }
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #1F2937;
        }
        .consent-text {
          background-color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 1px solid #E5E7EB;
        }
        .consent-text h3 {
          margin: 0 0 20px 0;
          color: #1F2937;
          font-size: 20px;
        }
        .consent-text p {
          margin: 0 0 15px 0;
          font-size: 14px;
          color: #374151;
        }
        .signature-section {
          background-color: white;
          padding: 30px;
          border-radius: 12px;
          margin-bottom: 30px;
          border: 1px solid #E5E7EB;
        }
        .signature-section h3 {
          margin: 0 0 20px 0;
          color: #1F2937;
          font-size: 20px;
        }
        .signature-container {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }
        .signature-info {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #E5E7EB;
        }
        .signature-info p {
          margin: 5px 0;
          font-size: 14px;
          color: #6B7280;
        }
        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #E5E7EB;
          color: #6B7280;
          font-size: 12px;
        }
        @media print {
          body {
            background-color: white;
            padding: 20px;
          }
          .header, .patient-info, .consent-text, .signature-section {
            border: 1px solid #000;
            margin-bottom: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">FollowNest</div>
        <h1 class="title">Digital Consent Agreement</h1>
        <p class="subtitle">Medical Data Processing Consent</p>
      </div>
      
      <div class="patient-info">
        <h3>Patient Information</h3>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Patient Name</span>
            <span class="info-value">${patientInfo.name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Date of Birth</span>
            <span class="info-value">${patientInfo.dateOfBirth}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Patient ID</span>
            <span class="info-value">${patientInfo.patientId}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Consent Date</span>
            <span class="info-value">${formattedDate}</span>
          </div>
        </div>
      </div>
      
      <div class="consent-text">
        <h3>Consent Agreement</h3>
        <p>
          By signing this document, I, <strong>${patientInfo.name}</strong>, hereby provide my informed consent 
          for the collection, processing, and storage of my medical data for the purposes of my healthcare 
          treatment and follow-up care.
        </p>
        <p>
          I understand and agree to the following:
        </p>
        <ul>
          <li>My medical data will be collected and processed for healthcare purposes</li>
          <li>My data will be stored securely in accordance with applicable privacy laws</li>
          <li>I have the right to access, correct, or delete my data as permitted by law</li>
          <li>My data may be shared with healthcare providers involved in my care</li>
          <li>I can withdraw my consent at any time by contacting the healthcare provider</li>
        </ul>
        <p>
          I acknowledge that I have read and understood this consent agreement and voluntarily provide 
          my consent for the processing of my medical data.
        </p>
      </div>
      
      <div class="signature-section">
        <h3>Digital Signature</h3>
        <div class="signature-container">
          ${signatureSVG}
        </div>
        <div class="signature-info">
          <p><strong>Signed by:</strong> ${patientInfo.name}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Digital Signature ID:</strong> ${generateSignatureId(signatureData)}</p>
        </div>
      </div>
      
      <div class="footer">
        <p>This document was generated electronically by FollowNest on ${formattedDate} at ${formattedTime}</p>
        <p>Document ID: CONSENT-${patientInfo.patientId}-${new Date(timestamp).getTime()}</p>
      </div>
    </body>
    </html>
  `;
};

const generateSignatureId = (signatureData: SignatureData): string => {
  const pathsHash = signatureData.paths.join('').length.toString(16);
  const timestamp = new Date(signatureData.timestamp).getTime().toString(16);
  return `SIG-${pathsHash}-${timestamp}`.toUpperCase();
};

export const shareConsentDocument = async (filePath: string): Promise<void> => {
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/html',
        dialogTitle: 'Share Consent Document',
      });
    } else {
      console.log('Sharing is not available on this platform');
    }
  } catch (error) {
    console.error('Error sharing document:', error);
    throw new Error('Failed to share consent document');
  }
};

export const generateConsentDocumentFromSignature = async (
  signatureData: any,
  patientInfo: PatientInfo
): Promise<string> => {
  try {
    console.log('Raw signature data:', signatureData);
    
    // Handle different possible data structures from backend
    let paths = [];
    let dimensions = { width: 300, height: 150 };
    let timestamp = new Date().toISOString();
    
    // Parse svgPaths if it's a JSON string
    let svgPaths = signatureData.svgPaths;
    if (typeof svgPaths === 'string') {
      try {
        svgPaths = JSON.parse(svgPaths);
      } catch (e) {
        console.warn('Failed to parse svgPaths JSON:', e);
        svgPaths = null;
      }
    }
    
    // Check if svgPaths exists and is an array
    if (svgPaths && Array.isArray(svgPaths)) {
      paths = svgPaths;
    } else if (svgPaths && typeof svgPaths === 'object' && svgPaths.paths && Array.isArray(svgPaths.paths)) {
      // Handle nested structure: { paths: [...], timestamp: ... }
      paths = svgPaths.paths;
    } else if (signatureData.paths && Array.isArray(signatureData.paths)) {
      paths = signatureData.paths;
    } else {
      console.warn('No valid paths found in signature data:', {
        svgPaths: signatureData.svgPaths,
        parsedSvgPaths: svgPaths,
        paths: signatureData.paths
      });
      // Create a simple fallback signature
      paths = [];
    }
    
    // Handle dimensions - parse if it's a JSON string
    let dims = signatureData.dimensions;
    if (typeof dims === 'string') {
      try {
        dims = JSON.parse(dims);
      } catch (e) {
        console.warn('Failed to parse dimensions JSON:', e);
        dims = null;
      }
    }
    
    if (dims && typeof dims === 'object') {
      dimensions = dims;
    }
    
    // Handle timestamp
    if (signatureData.timestamp) {
      timestamp = signatureData.timestamp;
    }
    
    // Convert backend signature data to the format expected by generateSignatureSVG
    const formattedSignatureData = {
      paths: paths,
      dimensions: dimensions,
      timestamp: timestamp
    };
    
    console.log('Formatted signature data:', formattedSignatureData);
    
    // Convert signature paths to SVG
    const signatureSVG = generateSignatureSVG(formattedSignatureData);
    
    // Generate HTML content
    const htmlContent = generateConsentHTML(signatureSVG, patientInfo, timestamp, formattedSignatureData);
    
    // Create PDF file path
    const fileName = `consent_${patientInfo.patientId}_${new Date().getTime()}.html`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(filePath, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    return filePath;
  } catch (error) {
    console.error('Error generating consent document from signature:', error);
    throw new Error('Failed to generate consent document');
  }
}; 