import { getSession } from 'next-auth/react';
import connectToDatabase from '../../../../lib/mongodb';
import Response from '../../../../models/Response';
import FormTemplate from '../../../../models/FormTemplate';
import * as XLSX from 'xlsx';
import { sendExcelResponse, prepareExcelData, generateExcelFilename } from '../../../../utils/excelExport';

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
      
      // Get form template with full details
      const formTemplate = await FormTemplate.findById(id).populate('createdBy', 'name email');
      
      if (!formTemplate) {
        return res.status(404).json({ message: 'Form template not found' });
      }
      
      // Get all responses for this form with full population
      const responses = await Response.find({ formTemplate: id })
        .populate('respondent', 'name email district role mobileNumber')
        .populate('ward', 'name district panchayath')
        .populate('formTemplate', 'title formType weekNumber year')
        .sort({ submittedAt: -1 });
      
      // Create comprehensive Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Sheet 1: Complete Response Data
      const responseHeaders = [
        'Response ID',
        'Submission Date',
        'Submission Time',
        'Submission DateTime (ISO)',
        'Respondent Name',
        'Respondent Email',
        'Respondent Mobile',
        'Respondent Role',
        'Respondent District',
        'Ward Name',
        'Ward District',
        'Ward Panchayath',
        'Form Title',
        'Form Type',
        'Week Number',
        'Year'
      ];
      
      // Add all field columns with detailed information
      formTemplate.fields.forEach(field => {
        responseHeaders.push(`${field.label} (Response)`);
        responseHeaders.push(`${field.label} (Field Type)`);
        responseHeaders.push(`${field.label} (Required)`);
        responseHeaders.push(`${field.label} (Options)`);
        
        // Add sub-questions
        if (field.subQuestions && field.subQuestions.length > 0) {
          field.subQuestions.forEach(subQ => {
            responseHeaders.push(`${field.label} → ${subQ.label} (Response)`);
            responseHeaders.push(`${field.label} → ${subQ.label} (Type)`);
            responseHeaders.push(`${field.label} → ${subQ.label} (Required)`);
          });
        }
      });
      
      const responseData = [responseHeaders];
      
      responses.forEach(response => {
        const baseRow = [
          response._id.toString(),
          new Date(response.submittedAt).toLocaleDateString(),
          new Date(response.submittedAt).toLocaleTimeString(),
          response.submittedAt.toISOString(),
          response.respondent?.name || '',
          response.respondent?.email || '',
          response.respondent?.mobileNumber || '',
          response.respondent?.role || '',
          response.respondent?.district || response.district || '',
          response.ward?.name || '',
          response.ward?.district || '',
          response.ward?.panchayath || '',
          formTemplate.title,
          formTemplate.formType,
          formTemplate.weekNumber,
          formTemplate.year
        ];
        
        // Add field responses with metadata
        formTemplate.fields.forEach(field => {
          const value = response.responses[field.label];
          
          // Response value
          if (Array.isArray(value)) {
            baseRow.push(value.join('; '));
          } else {
            baseRow.push(value || '');
          }
          
          // Field metadata
          baseRow.push(field.type);
          baseRow.push(field.required ? 'Yes' : 'No');
          baseRow.push(field.options ? field.options.join('; ') : '');
          
          // Sub-questions
          if (field.subQuestions && field.subQuestions.length > 0) {
            field.subQuestions.forEach(subQ => {
              const subValue = response.responses[`${field.label} → ${subQ.label}`] || 
                              response.responses[`${field.label} > ${subQ.label}`] ||
                              response.responses[subQ.label];
              
              if (Array.isArray(subValue)) {
                baseRow.push(subValue.join('; '));
              } else {
                baseRow.push(subValue || '');
              }
              
              baseRow.push(subQ.type);
              baseRow.push(subQ.required ? 'Yes' : 'No');
            });
          }
        });
        
        responseData.push(baseRow);
      });
      
      const responseSheet = XLSX.utils.aoa_to_sheet(responseData);
      
      // Auto-size columns
      const colWidths = responseHeaders.map((header, i) => {
        const maxLength = Math.max(
          header.length,
          ...responseData.slice(1).map(row => String(row[i] || '').length)
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      responseSheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, responseSheet, 'All Responses');
      
      // Sheet 2: Form Configuration
      const formConfigData = [
        ['Form Configuration', ''],
        ['Form ID', formTemplate._id.toString()],
        ['Title', formTemplate.title],
        ['Description', formTemplate.description || 'No description'],
        ['Form Type', formTemplate.formType],
        ['Week Number', formTemplate.weekNumber],
        ['Year', formTemplate.year],
        ['Active Status', formTemplate.isActive ? 'Active' : 'Inactive'],
        ['Created At', new Date(formTemplate.createdAt).toLocaleString()],
        ['Created By', formTemplate.createdBy?.name || 'Unknown'],
        ['Enable Date/Time', new Date(formTemplate.enableDateTime).toLocaleString()],
        ['Close Date/Time', new Date(formTemplate.closeDateTime).toLocaleString()],
        ['Total Fields', formTemplate.fields.length],
        ['Total Responses', responses.length],
        [''],
        ['Field Details', ''],
        ['#', 'Field Name', 'Type', 'Required', 'Options', 'Sub-Questions Count', 'Show Sub-Questions When']
      ];
      
      formTemplate.fields.forEach((field, index) => {
        formConfigData.push([
          index + 1,
          field.label,
          field.type,
          field.required ? 'Yes' : 'No',
          field.options ? field.options.join('; ') : '',
          field.subQuestions ? field.subQuestions.length : 0,
          field.showSubQuestionsWhen || ''
        ]);
        
        // Add sub-question details
        if (field.subQuestions && field.subQuestions.length > 0) {
          field.subQuestions.forEach((subQ, subIndex) => {
            formConfigData.push([
              `${index + 1}.${subIndex + 1}`,
              `  └─ ${subQ.label}`,
              subQ.type,
              subQ.required ? 'Yes' : 'No',
              subQ.options ? subQ.options.join('; ') : '',
              '',
              ''
            ]);
          });
        }
      });
      
      const formConfigSheet = XLSX.utils.aoa_to_sheet(formConfigData);
      XLSX.utils.book_append_sheet(workbook, formConfigSheet, 'Form Configuration');
      
      // Sheet 3: Response Analytics
      const analyticsData = [
        ['Response Analytics', ''],
        ['Export Generated At', new Date().toLocaleString()],
        ['Export Generated By', session.user.name],
        [''],
        ['Response Summary', ''],
        ['Total Responses', responses.length],
        ['First Response', responses.length > 0 ? new Date(responses[responses.length - 1].submittedAt).toLocaleString() : 'N/A'],
        ['Latest Response', responses.length > 0 ? new Date(responses[0].submittedAt).toLocaleString() : 'N/A'],
        [''],
        ['Response by District', ''],
        ['District', 'Count', 'Percentage']
      ];
      
      // District analysis
      const districtStats = {};
      responses.forEach(response => {
        const district = response.respondent?.district || response.district || 'Unknown';
        districtStats[district] = (districtStats[district] || 0) + 1;
      });
      
      Object.entries(districtStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([district, count]) => {
          const percentage = ((count / responses.length) * 100).toFixed(1);
          analyticsData.push([district, count, `${percentage}%`]);
        });
      
      analyticsData.push(['']);
      analyticsData.push(['Response by Role', '']);
      analyticsData.push(['Role', 'Count', 'Percentage']);
      
      // Role analysis
      const roleStats = {};
      responses.forEach(response => {
        const role = response.respondent?.role || 'Unknown';
        roleStats[role] = (roleStats[role] || 0) + 1;
      });
      
      Object.entries(roleStats)
        .sort(([,a], [,b]) => b - a)
        .forEach(([role, count]) => {
          const percentage = ((count / responses.length) * 100).toFixed(1);
          analyticsData.push([role, count, `${percentage}%`]);
        });
      
      // Daily response pattern
      analyticsData.push(['']);
      analyticsData.push(['Daily Response Pattern', '']);
      analyticsData.push(['Date', 'Responses', 'Cumulative']);
      
      const dailyStats = {};
      responses.forEach(response => {
        const date = new Date(response.submittedAt).toLocaleDateString();
        dailyStats[date] = (dailyStats[date] || 0) + 1;
      });
      
      let cumulative = 0;
      Object.entries(dailyStats)
        .sort(([a], [b]) => new Date(a) - new Date(b))
        .forEach(([date, count]) => {
          cumulative += count;
          analyticsData.push([date, count, cumulative]);
        });
      
      const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData);
      XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics');
      
      // Generate Excel file with UTF-8 encoding
      const excelBuffer = XLSX.write(workbook, { 
        type: 'buffer', 
        bookType: 'xlsx',
        cellStyles: true,
        compression: true
      });
      
      // Set headers for download with UTF-8 encoding
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${formTemplate.title}_Complete_Export_${new Date().toISOString().split('T')[0]}.xlsx"`);
      
      return res.status(200).send(excelBuffer);
      
    } catch (error) {
      console.error('Export error:', error);
      return res.status(500).json({ message: 'Error exporting form responses', error: error.message });
    }
  }
  
  return res.status(405).json({ message: 'Method not allowed' });
}