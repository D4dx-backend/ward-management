import { getSession } from 'next-auth/react';
import connectToDatabase from '../../../../lib/mongodb';
import Response from '../../../../models/Response';
import FormTemplate from '../../../../models/FormTemplate';
import * as XLSX from 'xlsx';

export default async function handler(req, res) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Only state admins can export form responses
  if (session.user.role !== 'stateAdmin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  await connectToDatabase();
  
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      // Get form template
      const formTemplate = await FormTemplate.findById(id);
      
      if (!formTemplate) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      // Get all responses for this form
      const responses = await Response.find({ formTemplate: id })
        .populate('respondent', 'name email district role')
        .populate({
          path: 'ward',
          select: 'name district coordinator',
          populate: {
            path: 'coordinator',
            select: 'name _id'
          }
        })
        .sort({ submittedAt: -1 });
      
      // Create comprehensive CSV content with all field details
      const headers = [
        'Response ID',
        'Submitted At',
        'Submitted Date',
        'Submitted Time',
        'Respondent Name',
        'Respondent Email',
        'Respondent Role',
        'District',
        'Ward Name',
        'Ward District',
        'Form Type',
        'Week Number',
        'Year'
      ];

      // Add all main fields and their sub-questions
      const allFieldHeaders = [];
      formTemplate.fields.forEach(field => {
        allFieldHeaders.push(field.label);
        allFieldHeaders.push(`${field.label} (Type)`);
        allFieldHeaders.push(`${field.label} (Required)`);
        
        // Add sub-questions if they exist
        if (field.subQuestions && field.subQuestions.length > 0) {
          field.subQuestions.forEach(subQ => {
            allFieldHeaders.push(`${field.label} > ${subQ.label}`);
            allFieldHeaders.push(`${field.label} > ${subQ.label} (Type)`);
          });
        }
      });

      const finalHeaders = [...headers, ...allFieldHeaders];
      
      const csvRows = [
        finalHeaders.join(','),
        ...responses.map(response => {
          const baseData = [
            response._id.toString(),
            new Date(response.submittedAt).toLocaleString(),
            new Date(response.submittedAt).toLocaleDateString(),
            new Date(response.submittedAt).toLocaleTimeString(),
            response.respondent?.name || '',
            response.respondent?.email || '',
            response.respondent?.role || '',
            response.district || '',
            response.ward?.name || '',
            response.ward?.district || '',
            formTemplate.formType,
            formTemplate.weekNumber,
            formTemplate.year
          ];

          // Add field data with detailed information
          const fieldData = [];
          formTemplate.fields.forEach(field => {
            const value = response.responses[field.label];
            
            // Main field value
            if (Array.isArray(value)) {
              fieldData.push(`"${value.join('; ')}"`)
            } else {
              fieldData.push(`"${value || ''}"`)
            }
            
            // Field type
            fieldData.push(`"${field.type}"`);
            
            // Field required status
            fieldData.push(`"${field.required ? 'Yes' : 'No'}"`);
            
            // Sub-questions data
            if (field.subQuestions && field.subQuestions.length > 0) {
              field.subQuestions.forEach(subQ => {
                const subValue = response.responses[`${field.label} > ${subQ.label}`] || 
                                response.responses[subQ.label];
                
                if (Array.isArray(subValue)) {
                  fieldData.push(`"${subValue.join('; ')}"`)
                } else {
                  fieldData.push(`"${subValue || ''}"`)
                }
                
                // Sub-question type
                fieldData.push(`"${subQ.type}"`);
              });
            }
          });

          return [...baseData, ...fieldData].join(',');
        })
      ];
      
      // Check if Excel export is requested
      const { format } = req.query;
      
      if (format === 'excel') {
        // Create Excel workbook with multiple sheets
        const workbook = XLSX.utils.book_new();
        
        // Sheet 1: Responses Data
        const responsesData = [
          finalHeaders,
          ...responses.map(response => {
            const baseData = [
              response._id.toString(),
              new Date(response.submittedAt).toLocaleString(),
              new Date(response.submittedAt).toLocaleDateString(),
              new Date(response.submittedAt).toLocaleTimeString(),
              response.respondent?.name || '',
              response.respondent?.email || '',
              response.respondent?.role || '',
              response.district || '',
              response.ward?.name || '',
              response.ward?.district || '',
              formTemplate.formType,
              formTemplate.weekNumber,
              formTemplate.year
            ];

            const fieldData = [];
            formTemplate.fields.forEach(field => {
              const value = response.responses[field.label];
              
              // Main field value
              if (Array.isArray(value)) {
                fieldData.push(value.join('; '))
              } else {
                fieldData.push(value || '')
              }
              
              // Field type
              fieldData.push(field.type);
              
              // Field required status
              fieldData.push(field.required ? 'Yes' : 'No');
              
              // Sub-questions data
              if (field.subQuestions && field.subQuestions.length > 0) {
                field.subQuestions.forEach(subQ => {
                  const subValue = response.responses[`${field.label} > ${subQ.label}`] || 
                                  response.responses[subQ.label];
                  
                  if (Array.isArray(subValue)) {
                    fieldData.push(subValue.join('; '))
                  } else {
                    fieldData.push(subValue || '')
                  }
                  
                  // Sub-question type
                  fieldData.push(subQ.type);
                });
              }
            });

            return [...baseData, ...fieldData];
          })
        ];
        
        const responsesSheet = XLSX.utils.aoa_to_sheet(responsesData);
        XLSX.utils.book_append_sheet(workbook, responsesSheet, 'Responses');
        
        // Sheet 2: Form Structure
        const formStructureData = [
          ['Form Information', ''],
          ['Title', formTemplate.title],
          ['Description', formTemplate.description || ''],
          ['Form Type', formTemplate.formType],
          ['Week Number', formTemplate.weekNumber],
          ['Year', formTemplate.year],
          ['Created At', new Date(formTemplate.createdAt).toLocaleString()],
          ['Enable Date/Time', new Date(formTemplate.enableDateTime).toLocaleString()],
          ['Close Date/Time', new Date(formTemplate.closeDateTime).toLocaleString()],
          ['Active Status', formTemplate.isActive ? 'Active' : 'Inactive'],
          ['Total Responses', responses.length],
          [''],
          ['Field Structure', ''],
          ['Field Name', 'Type', 'Required', 'Options', 'Sub-Questions']
        ];
        
        formTemplate.fields.forEach(field => {
          formStructureData.push([
            field.label,
            field.type,
            field.required ? 'Yes' : 'No',
            field.options ? field.options.join('; ') : '',
            field.subQuestions ? field.subQuestions.length : 0
          ]);
          
          // Add sub-questions details
          if (field.subQuestions && field.subQuestions.length > 0) {
            field.subQuestions.forEach(subQ => {
              formStructureData.push([
                `  └─ ${subQ.label}`,
                subQ.type,
                subQ.required ? 'Yes' : 'No',
                subQ.options ? subQ.options.join('; ') : '',
                ''
              ]);
            });
          }
        });
        
        const formStructureSheet = XLSX.utils.aoa_to_sheet(formStructureData);
        XLSX.utils.book_append_sheet(workbook, formStructureSheet, 'Form Structure');
        
        // Sheet 3: Summary Statistics
        const summaryData = [
          ['Summary Statistics', ''],
          ['Total Responses', responses.length],
          ['Response Rate by District', ''],
          ['District', 'Response Count']
        ];
        
        // Calculate district-wise response counts
        const districtCounts = {};
        responses.forEach(response => {
          const district = response.district || 'Unknown';
          districtCounts[district] = (districtCounts[district] || 0) + 1;
        });
        
        Object.entries(districtCounts).forEach(([district, count]) => {
          summaryData.push([district, count]);
        });
        
        summaryData.push(['']);
        summaryData.push(['Response Timeline', '']);
        summaryData.push(['Date', 'Response Count']);
        
        // Calculate daily response counts
        const dailyCounts = {};
        responses.forEach(response => {
          const date = new Date(response.submittedAt).toLocaleDateString();
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });
        
        Object.entries(dailyCounts).sort().forEach(([date, count]) => {
          summaryData.push([date, count]);
        });
        
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
        
        // Generate Excel file
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Set headers for Excel download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${formTemplate.title}_detailed_export.xlsx"`);
        
        return res.status(200).send(excelBuffer);
      } else {
        // Default CSV export
        const csvContent = csvRows.join('\n');
        
        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${formTemplate.title}_detailed_responses.csv"`);
        
        return res.status(200).send(csvContent);
      }
    } catch (error) {
      return res.status(500).json({ message: 'Error exporting form responses', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}