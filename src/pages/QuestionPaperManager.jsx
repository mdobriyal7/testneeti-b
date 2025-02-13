import React, { useState, useEffect } from "react";
import { useToast } from "react-hot-toast";
import { Dialog, X } from "@/components/ui/dialog";
import { FileText, Settings, Clock, ChevronRight } from "lucide-react";

// Create/Edit Modal component
const QuestionPaperModal = ({
  isOpen,
  onClose,
  testSeriesId,
  sectionId,
  editingPaper = null,
  onSuccess,
}) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: "",
    templateId: "",
    isActive: true,
    settings: {
      shuffleQuestions: true,
      showCalculator: false,
      timeLimit: 180,
    },
  });

  const { data: templates, isLoading: isLoadingTemplates } =
    useGetTemplatesQuery({ testSeriesId, sectionId }, { skip: !isOpen });

  useEffect(() => {
    if (editingPaper) {
      setFormData({
        title: editingPaper.title,
        templateId: editingPaper.template._id,
        isActive: editingPaper.isActive,
        settings: {
          ...editingPaper.settings,
        },
      });
    } else {
      setFormData({
        title: "",
        templateId: "",
        isActive: true,
        settings: {
          shuffleQuestions: true,
          showCalculator: false,
          timeLimit: 180,
        },
      });
    }
  }, [editingPaper]);

  const handleSubmit = async () => {
    try {
      if (!formData.templateId) {
        toast.error("Please select a template");
        return;
      }

      if (!formData.title.trim()) {
        toast.error("Please enter a title");
        return;
      }

      // TODO: Add API mutation call here
      toast.success(
        `Question paper ${editingPaper ? "updated" : "created"} successfully!`
      );
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.data?.message || "Failed to save question paper");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
          {/* Header */}
          <div className="bg-blue-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                Import Test Settings
              </h2>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-blue-100 text-sm mt-1">
              Create a template from existing test settings
            </p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Template Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Template title will be auto-generated"
              />
              <p className="mt-1 text-sm text-gray-500">
                A unique title will be generated, but you can modify it
              </p>
            </div>

            {/* Import Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Import Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  className={`p-4 border rounded-lg text-left transition-all ${
                    !formData.templateId
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                      : "border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, templateId: "" }))}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Full Test</p>
                      <p className="text-sm text-gray-500">
                        Import all sections and settings
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  className={`p-4 border rounded-lg text-left transition-all ${
                    formData.templateId
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                      : "border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                  }`}
                  onClick={() => setFormData((prev) => ({ ...prev, templateId: templates?.[0]?._id || "" }))}
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Settings className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Specific Sections</p>
                      <p className="text-sm text-gray-500">
                        Choose sections to import
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Select Test */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Test
              </label>
              {isLoadingTemplates ? (
                <div className="flex items-center space-x-2 text-sm text-gray-500 p-3 border border-gray-200 rounded-lg">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading templates...</span>
                </div>
              ) : (
                <button
                  className="w-full p-4 border border-gray-200 rounded-lg text-left hover:border-blue-500 transition-all"
                  onClick={() => {
                    // Show test selection UI
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {templates?.[0]?.title || "Select a test"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {templates?.[0]?.duration
                            ? `${templates[0].duration} mins • ${
                                templates[0].sections?.length || 0
                              } sections`
                            : "No test selected"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!formData.title || !formData.templateId}
            >
              Import Settings
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default QuestionPaperModal; 