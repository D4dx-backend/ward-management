import ActivityLog from '../models/ActivityLog';

export const logActivity = async ({
  userId,
  action,
  description,
  entityType = null,
  entityId = null,
  metadata = {},
  district,
  ward = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    // Ensure district is never null or undefined
    const validDistrict = district || 'Unknown';
    
    // Prepare log data - only include entityType if it's not null
    const logData = {
      user: userId,
      action,
      description,
      metadata,
      district: validDistrict,
      ipAddress,
      userAgent
    };
    
    // Only add entityType and entityId if entityType is provided and valid
    if (entityType && entityType !== null) {
      logData.entityType = entityType;
      logData.entityId = entityId;
    }
    
    // Only add ward if it's not null
    if (ward && ward !== null) {
      logData.ward = ward;
    }
    
    const log = new ActivityLog(logData);
    
    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking main functionality
    return null;
  }
};

export const ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  FORM_SUBMIT: 'FORM_SUBMIT',
  FORM_CREATE: 'FORM_CREATE',
  FORM_UPDATE: 'FORM_UPDATE',
  FORM_DELETE: 'FORM_DELETE',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  WARD_CREATE: 'WARD_CREATE',
  WARD_UPDATE: 'WARD_UPDATE',
  WARD_DELETE: 'WARD_DELETE',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  DOCUMENT_DELETE: 'DOCUMENT_DELETE',
  INSTRUCTION_CREATE: 'INSTRUCTION_CREATE',
  INSTRUCTION_UPDATE: 'INSTRUCTION_UPDATE',
  INSTRUCTION_DELETE: 'INSTRUCTION_DELETE',
  REPORT_VIEW: 'REPORT_VIEW',
  REPORT_EXPORT: 'REPORT_EXPORT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PROFILE_UPDATE: 'PROFILE_UPDATE'
};