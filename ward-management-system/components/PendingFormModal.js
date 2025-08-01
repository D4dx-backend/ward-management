import Modal from './Modal';
import Button from './Button';

const PendingFormModal = ({ isOpen, onClose, form }) => {
  if (!form) return null;

  const handleSubmitForm = () => {
    // Navigate to specific form submission page with form ID
    if (form._id) {
      window.location.href = `/ward/reports/submit/${form._id}`;
    } else {
      // Fallback to general submit page if no form ID
      window.location.href = '/ward/reports/submit';
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={form.title || 'Pending Form'} size="md">
      <div className="space-y-6">
        {/* Form Header */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Form Not Submitted
              </h4>
              <div className="space-y-2 text-sm text-red-700">
                <p><strong>Form:</strong> {form.title}</p>
                <p><strong>Type:</strong> {form.formType === 'wardReport' ? 'Ward Report' : form.formType}</p>
                <p><strong>Period:</strong> Week {form.weekNumber}, {form.year}</p>
                <p><strong>Due Date:</strong> {new Date(form.closeDateTime).toLocaleDateString()}</p>
                {form.closeDateTime && new Date(form.closeDateTime) < new Date() && (
                  <p className="text-red-600 font-medium">⚠️ This form is overdue</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Description */}
        {form.description && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-2">Description</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {form.description}
              </p>
            </div>
          </div>
        )}

        {/* Form Details */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Form Details</h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Status:</dt>
                <dd className="text-sm text-red-600 font-medium">Not Submitted</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Open Date:</dt>
                <dd className="text-sm text-gray-900">
                  {form.openDateTime ? new Date(form.openDateTime).toLocaleDateString() : 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Close Date:</dt>
                <dd className="text-sm text-gray-900">
                  {new Date(form.closeDateTime).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Time Remaining:</dt>
                <dd className="text-sm text-gray-900">
                  {(() => {
                    const now = new Date();
                    const closeDate = new Date(form.closeDateTime);
                    const diffTime = closeDate - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < 0) {
                      return <span className="text-red-600 font-medium">Overdue by {Math.abs(diffDays)} days</span>;
                    } else if (diffDays === 0) {
                      return <span className="text-orange-600 font-medium">Due today</span>;
                    } else if (diffDays === 1) {
                      return <span className="text-orange-600 font-medium">Due tomorrow</span>;
                    } else {
                      return `${diffDays} days remaining`;
                    }
                  })()}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleSubmitForm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Submit Form Now
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PendingFormModal;