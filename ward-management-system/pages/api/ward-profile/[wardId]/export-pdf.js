import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import connectToDatabase from '../../../../lib/mongodb';
import Ward from '../../../../models/Ward';
import WardBasicForm from '../../../../models/WardBasicForm';
import WardBasicData from '../../../../models/WardBasicData';
import Cluster from '../../../../models/Cluster';
import User from '../../../../models/User';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Only coordinators and Ward Incharges can export
  if (!['coordinator', 'wardAdmin'].includes(session.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const { wardId } = req.query;

  try {
    await connectToDatabase();

    // Verify user has access to this ward
    const hasAccess = await verifyWardAccess(session.user, wardId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this ward' });
    }

    // Get ward details with coordinator info
    const ward = await Ward.findById(wardId)
      .populate('coordinator', 'name email mobileNumber')
      .lean();

    if (!ward) {
      return res.status(404).json({ message: 'Ward not found' });
    }

    // Get clusters for this ward
    const clusters = await Cluster.find({ ward: wardId })
      .populate('coordinator', 'name mobileNumber')
      .lean();

    // Get active ward basic form (advanced data form)
    const activeForm = await WardBasicForm.findOne({ isActive: true }).lean();
    
    let advancedData = null;

    if (activeForm) {
      // Get ward's advanced data responses
      const wardData = await WardBasicData.findOne({
        ward: wardId,
        form: activeForm._id
      }).lean();

      if (wardData) {
        advancedData = {
          form: activeForm,
          responses: wardData.data,
          clusterResponses: wardData.clusterData || {},
          submittedAt: wardData.submittedAt
        };
      }
    }

    // Generate HTML content for PDF
    const htmlContent = generateWardProfileHTML(ward, clusters, advancedData);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="ward-profile-${ward.name}-${ward.wardNumber}.html"`);
    
    res.status(200).send(htmlContent);
  } catch (error) {
    console.error('Error exporting ward profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function generateWardProfileHTML(ward, clusters, advancedData) {
  const currentDate = new Date().toLocaleDateString('en-IN');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ward Profile - ${ward.name}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .section-title {
            background-color: #f5f5f5;
            padding: 10px;
            border-left: 4px solid #007bff;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 15px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-item {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .info-label {
            font-weight: bold;
            color: #666;
            font-size: 14px;
        }
        .info-value {
            margin-top: 5px;
            font-size: 16px;
        }
        .cluster-item {
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 10px;
        }
        .question-item {
            margin-bottom: 15px;
            padding: 10px;
            border-left: 3px solid #28a745;
            background-color: #f8f9fa;
        }
        .question-label {
            font-weight: bold;
            margin-bottom: 5px;
        }
        .question-answer {
            color: #555;
        }
        .cluster-section {
            margin-top: 20px;
            padding: 15px;
            background-color: #fff3cd;
            border-radius: 5px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Ward Profile Report</h1>
        <h2>${ward.name} (Ward #${ward.wardNumber})</h2>
        <p>${ward.panchayath}, ${ward.district}</p>
        <p>Generated on: ${currentDate}</p>
    </div>

    <div class="section">
        <div class="section-title">Basic Information</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Ward Name</div>
                <div class="info-value">${ward.name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Ward Number</div>
                <div class="info-value">#${ward.wardNumber}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Panchayath</div>
                <div class="info-value">${ward.panchayath}</div>
            </div>
            <div class="info-item">
                <div class="info-label">District</div>
                <div class="info-value">${ward.district}</div>
            </div>
            <div class="info-item">
                <div class="info-label">State</div>
                <div class="info-value">${ward.state || 'Kerala'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value">${ward.isActive ? 'Active' : 'Inactive'}</div>
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">Ward Statistics</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Population</div>
                <div class="info-value">${ward.population || 'Not set'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Area (sq km)</div>
                <div class="info-value">${ward.area || 'Not set'}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Total Clusters</div>
                <div class="info-value">${clusters.length}</div>
            </div>
        </div>
        ${ward.description ? `
        <div class="info-item">
            <div class="info-label">Description</div>
            <div class="info-value">${ward.description}</div>
        </div>
        ` : ''}
    </div>

    ${ward.coordinator ? `
    <div class="section">
        <div class="section-title">Coordinator Information</div>
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Name</div>
                <div class="info-value">${ward.coordinator.name}</div>
            </div>
            ${ward.coordinator.email ? `
            <div class="info-item">
                <div class="info-label">Email</div>
                <div class="info-value">${ward.coordinator.email}</div>
            </div>
            ` : ''}
            ${ward.coordinator.mobileNumber ? `
            <div class="info-item">
                <div class="info-label">Mobile Number</div>
                <div class="info-value">${ward.coordinator.mobileNumber}</div>
            </div>
            ` : ''}
        </div>
    </div>
    ` : ''}

    ${advancedData ? `
    <div class="section">
        <div class="section-title">Ward Advanced Data</div>
        <p><strong>Form:</strong> ${advancedData.form.title}</p>
        ${advancedData.form.description ? `<p><strong>Description:</strong> ${advancedData.form.description}</p>` : ''}
        <p><strong>Last Updated:</strong> ${new Date(advancedData.submittedAt).toLocaleDateString('en-IN')}</p>
        
        ${generateAdvancedDataHTML(advancedData.form.fields, advancedData.responses, advancedData.clusterResponses, clusters)}
    </div>
    ` : ''}

    ${clusters.length > 0 ? `
    <div class="section">
        <div class="section-title">Ward Clusters</div>
        ${clusters.map(cluster => `
        <div class="cluster-item">
            <h4>${cluster.name} (Cluster #${cluster.clusterNumber})</h4>
            <p><strong>Coordinator:</strong> ${cluster.coordinator?.name || 'Not assigned'}</p>
            ${cluster.coordinator?.mobileNumber ? `<p><strong>Mobile:</strong> ${cluster.coordinator.mobileNumber}</p>` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="footer">
        <p>This report was generated from the Ward Management System</p>
        <p>© ${new Date().getFullYear()} Ward Management System</p>
    </div>
</body>
</html>
  `;
}

function generateAdvancedDataHTML(fields, responses, clusterResponses, clusters) {
  if (!fields || fields.length === 0) {
    return '<p>No advanced data fields available.</p>';
  }

  let html = '';
  
  // Regular ward fields
  const wardFields = fields.filter(field => !field.applicableToClusters);
  if (wardFields.length > 0) {
    html += '<h4>Ward Information</h4>';
    wardFields.forEach(field => {
      const value = responses[field.id] || 'Not answered';
      html += `
        <div class="question-item">
            <div class="question-label">${field.label}</div>
            <div class="question-answer">${formatFieldValue(field, value)}</div>
        </div>
      `;
    });
  }

  // Cluster-based fields
  const clusterFields = fields.filter(field => field.applicableToClusters);
  if (clusterFields.length > 0 && clusters.length > 0) {
    html += '<h4>Cluster-Based Information</h4>';
    clusters.forEach(cluster => {
      html += `<div class="cluster-section">`;
      html += `<h5>${cluster.name} (Cluster #${cluster.clusterNumber})</h5>`;
      
      clusterFields.forEach(field => {
        const value = clusterResponses[cluster._id]?.[field.id] || 'Not answered';
        html += `
          <div class="question-item">
              <div class="question-label">${field.label}</div>
              <div class="question-answer">${formatFieldValue(field, value)}</div>
          </div>
        `;
      });
      
      html += `</div>`;
    });
  }

  return html;
}

function formatFieldValue(field, value) {
  if (!value || value === 'Not answered') {
    return '<em>Not answered</em>';
  }

  switch (field.type) {
    case 'yesno':
      return value === 'yes' ? 'Yes' : 'No';
    case 'multiselect':
      return Array.isArray(value) ? value.join(', ') : value;
    case 'date':
      return new Date(value).toLocaleDateString('en-IN');
    default:
      return value;
  }
}

async function verifyWardAccess(user, wardId) {
  try {
    if (user.role === 'coordinator') {
      const ward = await Ward.findOne({
        _id: wardId,
        coordinator: user.id
      });
      return !!ward;
    }

    if (user.role === 'wardAdmin') {
      const ward = await Ward.findOne({
        _id: wardId,
        wardAdmin: user.id
      });
      return !!ward;
    }

    return false;
  } catch (error) {
    console.error('Error verifying ward access:', error);
    return false;
  }
}