import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import dbConnect from '../../../../../lib/mongodb';
import Ward from '../../../../../models/Ward';
import Cluster from '../../../../../models/Cluster';
import WardBasicData from '../../../../../models/WardBasicData';
import FormTemplate from '../../../../../models/FormTemplate';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (session.user.role !== 'coordinator') {
      return res.status(403).json({ message: 'Access denied. Coordinator role required.' });
    }

    await dbConnect();

    const { wardId } = req.query;
    const coordinatorId = session.user.id;

    // Verify ward belongs to coordinator
    const ward = await Ward.findOne({ 
      _id: wardId, 
      coordinator: coordinatorId,
      isActive: true 
    })
    .populate('coordinator', 'name email mobileNumber')
    .populate('wardAdmin', 'name email mobileNumber lastLogin');

    if (!ward) {
      return res.status(403).json({ message: 'Access denied. This ward is not under your coordination.' });
    }

    // Get clusters for this ward
    const clusters = await Cluster.find({ 
      ward: wardId, 
      isActive: true 
    })
    .populate('coordinator', 'name mobileNumber')
    .sort({ clusterNumber: 1 });

    // Get advanced form data
    let advancedData = null;
    
    try {
      // Get the active advanced form template
      const advancedForm = await FormTemplate.findOne({ 
        type: 'advanced',
        isActive: true 
      });

      if (advancedForm) {
        // Get submitted data for this ward
        const submittedData = await WardBasicData.findOne({
          ward: wardId,
          form: advancedForm._id
        });

        advancedData = {
          form: advancedForm,
          hasData: !!submittedData,
          responses: submittedData?.data || {},
          clusterResponses: submittedData?.clusterData || {},
          submittedAt: submittedData?.submittedAt
        };
      }
    } catch (advancedError) {
      console.error('Error fetching advanced data:', advancedError);
      // Continue without advanced data
    }

    // Generate HTML content
    const htmlContent = generateWardProfileHTML(ward, clusters, advancedData);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="ward-profile-${ward.name}-${ward.wardNumber}.html"`);
    
    res.status(200).send(htmlContent);

  } catch (error) {
    console.error('Error exporting coordinator ward profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

function generateWardProfileHTML(ward, clusters, advancedData) {
  const formatValue = (value, defaultText = 'Not set') => {
    if (value === null || value === undefined || value === '') {
      return `<span style="color: #9CA3AF; font-style: italic;">${defaultText}</span>`;
    }
    return `<span style="color: #111827;">${value}</span>`;
  };

  const formatFieldValue = (field, value) => {
    if (!value || value === '' || (Array.isArray(value) && value.length === 0)) {
      return '<span style="color: #9CA3AF; font-style: italic;">Not answered</span>';
    }

    switch (field.type) {
      case 'yesno':
        const color = value === 'yes' ? '#065F46' : '#991B1B';
        const bgColor = value === 'yes' ? '#D1FAE5' : '#FEE2E2';
        return `<span style="background-color: ${bgColor}; color: ${color}; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500;">${value === 'yes' ? 'Yes' : 'No'}</span>`;

      case 'multiselect':
        if (Array.isArray(value) && value.length > 0) {
          return value.map(item => 
            `<span style="background-color: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 500; margin-right: 4px;">${item}</span>`
          ).join('');
        }
        return '<span style="color: #9CA3AF; font-style: italic;">No options selected</span>';

      case 'date':
        try {
          const date = new Date(value);
          return `<span style="color: #111827;">${date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</span>`;
        } catch (error) {
          return '<span style="color: #EF4444;">Invalid date</span>';
        }

      case 'email':
        return `<a href="mailto:${value}" style="color: #2563EB; text-decoration: underline;">${value}</a>`;

      case 'phone':
        return `<a href="tel:${value}" style="color: #2563EB; text-decoration: underline;">${value}</a>`;

      case 'url':
        return `<a href="${value}" target="_blank" style="color: #2563EB; text-decoration: underline;">${value}</a>`;

      case 'number':
        return `<span style="color: #111827; font-family: monospace;">${typeof value === 'number' ? value.toLocaleString() : value}</span>`;

      case 'textarea':
        return `<div style="color: #111827; white-space: pre-wrap; background-color: #F9FAFB; padding: 8px; border-radius: 4px; border: 1px solid #E5E7EB;">${value}</div>`;

      case 'select':
        return `<span style="background-color: #F3F4F6; color: #374151; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500;">${value}</span>`;

      case 'text':
      default:
        return `<span style="color: #111827;">${value}</span>`;
    }
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${ward.name} Profile - Ward Management System</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
        }
        .section {
            background: white;
            margin-bottom: 20px;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #1f2937;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .field {
            margin-bottom: 12px;
        }
        .field-label {
            font-weight: 600;
            color: #374151;
            font-size: 13px;
            margin-bottom: 4px;
            display: block;
        }
        .field-value {
            font-size: 14px;
            color: #111827;
        }
        .cluster-card {
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 10px;
            background-color: #f9fafb;
        }
        .cluster-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .cluster-name {
            font-weight: 600;
            color: #111827;
        }
        .status-badge {
            padding: 2px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 600;
        }
        .status-active {
            background-color: #D1FAE5;
            color: #065F46;
        }
        .status-inactive {
            background-color: #FEE2E2;
            color: #991B1B;
        }
        .advanced-field {
            border-left: 4px solid #3B82F6;
            padding-left: 15px;
            margin-bottom: 15px;
        }
        .cluster-field {
            border-left: 4px solid #10B981;
            padding-left: 15px;
            margin-bottom: 15px;
        }
        .no-data {
            text-align: center;
            padding: 40px;
            color: #6B7280;
        }
        @media print {
            body { background-color: white; }
            .section { box-shadow: none; border: 1px solid #e5e7eb; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${ward.name} Profile</h1>
        <p>Ward #${ward.wardNumber} - ${ward.district}</p>
        <p style="font-size: 14px; opacity: 0.9;">Generated on ${new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
    </div>

    <!-- Basic Information -->
    <div class="section">
        <h2 class="section-title">Basic Information</h2>
        <div class="grid">
            <div class="field">
                <label class="field-label">Ward Name</label>
                <div class="field-value">${ward.name}</div>
            </div>
            <div class="field">
                <label class="field-label">Ward Number</label>
                <div class="field-value">#${ward.wardNumber}</div>
            </div>
            <div class="field">
                <label class="field-label">District</label>
                <div class="field-value">${ward.district}</div>
            </div>
            <div class="field">
                <label class="field-label">Panchayath</label>
                <div class="field-value">${ward.panchayath}</div>
            </div>
            <div class="field">
                <label class="field-label">Population</label>
                <div class="field-value">${formatValue(ward.population)}</div>
            </div>
            <div class="field">
                <label class="field-label">Area (sq km)</label>
                <div class="field-value">${formatValue(ward.area)}</div>
            </div>
        </div>
        ${ward.description ? `
        <div class="field" style="margin-top: 20px;">
            <label class="field-label">Description</label>
            <div class="field-value" style="background-color: #f9fafb; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb;">
                ${ward.description}
            </div>
        </div>
        ` : ''}
    </div>

    <!-- Ward Incharge Information -->
    ${ward.wardAdmin ? `
    <div class="section">
        <h2 class="section-title">Ward Incharge</h2>
        <div class="grid">
            <div class="field">
                <label class="field-label">Name</label>
                <div class="field-value">${ward.wardAdmin.name}</div>
            </div>
            <div class="field">
                <label class="field-label">Email</label>
                <div class="field-value">${ward.wardAdmin.email}</div>
            </div>
            <div class="field">
                <label class="field-label">Mobile Number</label>
                <div class="field-value">${ward.wardAdmin.mobileNumber || 'Not provided'}</div>
            </div>
            <div class="field">
                <label class="field-label">Last Login</label>
                <div class="field-value">
                    ${ward.wardAdmin.lastLogin 
                      ? new Date(ward.wardAdmin.lastLogin).toLocaleString()
                      : 'Never logged in'
                    }
                </div>
            </div>
        </div>
    </div>
    ` : ''}

    <!-- Clusters Information -->
    ${clusters && clusters.length > 0 ? `
    <div class="section">
        <h2 class="section-title">Clusters (${clusters.length})</h2>
        <div class="grid">
            ${clusters.map(cluster => `
            <div class="cluster-card">
                <div class="cluster-header">
                    <div class="cluster-name">${cluster.name}</div>
                    <span class="status-badge ${cluster.isActive ? 'status-active' : 'status-inactive'}">
                        ${cluster.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div style="font-size: 12px; color: #6B7280;">
                    <div>Cluster #${cluster.clusterNumber}</div>
                    <div>Coordinator: ${cluster.coordinator?.name || 'Not assigned'}</div>
                    ${cluster.coordinator?.mobileNumber ? `<div>Mobile: ${cluster.coordinator.mobileNumber}</div>` : ''}
                </div>
            </div>
            `).join('')}
        </div>
    </div>
    ` : ''}

    <!-- Advanced Data -->
    ${advancedData && advancedData.form ? `
    <div class="section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div>
                <h2 class="section-title" style="margin-bottom: 0;">${advancedData.form.title}</h2>
                <p style="color: #6B7280; font-size: 14px;">${advancedData.form.description}</p>
            </div>
            ${advancedData.hasData ? `
            <div style="font-size: 12px; color: #6B7280;">
                Last updated: ${new Date(advancedData.submittedAt).toLocaleDateString()}
            </div>
            ` : ''}
        </div>

        ${advancedData.hasData ? `
        <!-- Ward-level fields -->
        ${advancedData.form.fields
          .filter(field => !field.applicableToClusters)
          .map(field => `
          <div class="advanced-field">
              <div class="field-label">
                  ${field.label}
                  ${field.required ? '<span style="color: #EF4444;">*</span>' : ''}
              </div>
              <div class="field-value">
                  ${formatFieldValue(field, advancedData.responses?.[field.id])}
              </div>
              ${field.helpText ? `<p style="font-size: 11px; color: #6B7280; margin-top: 4px;">${field.helpText}</p>` : ''}
          </div>
          `).join('')}

        <!-- Cluster-level fields -->
        ${advancedData.form.fields.some(field => field.applicableToClusters) ? `
        <div style="margin-top: 30px;">
            <h3 style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 15px;">Cluster-specific Data</h3>
            ${clusters.map(cluster => `
            <div style="margin-bottom: 20px; border: 1px solid #E5E7EB; border-radius: 6px; padding: 15px;">
                <h4 style="font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 12px;">${cluster.name}</h4>
                ${advancedData.form.fields
                  .filter(field => field.applicableToClusters)
                  .map(field => `
                  <div class="cluster-field">
                      <div class="field-label">
                          ${field.label}
                          ${field.required ? '<span style="color: #EF4444;">*</span>' : ''}
                      </div>
                      <div class="field-value">
                          ${formatFieldValue(field, advancedData.clusterResponses?.[cluster._id]?.[field.id])}
                      </div>
                      ${field.helpText ? `<p style="font-size: 11px; color: #6B7280; margin-top: 4px;">${field.helpText}</p>` : ''}
                  </div>
                  `).join('')}
            </div>
            `).join('')}
        </div>
        ` : ''}
        ` : `
        <div class="no-data">
            <p>No data has been submitted for this form yet</p>
        </div>
        `}
    </div>
    ` : ''}

    <div style="text-align: center; margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
            This report was generated from the Ward Management System<br>
            Export Date: ${new Date().toLocaleString('en-IN')}
        </p>
    </div>
</body>
</html>
  `;
}