import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  Settings,
  Clock,
  AlertCircle,
  Save,
  ArrowLeft,
  Book,
  Layout,
  Sliders,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/Common/InputComponent";
import { Button } from "@/components/Common/ButtonComponent";
import { Switch } from "@/components/Common/SwitchComponent";
import DynamicBreadcrumb from "@/components/Common/DynamicBreadcrumb";
import { useToast } from "@/components/Toast/ToastProvider";
import CustomDropdown from "@/components/Common/CustomDropdown";
import {
  useGetTemplatesQuery,
  useCreateQuestionPaperMutation,
} from "@/features/testSeries/questionPaperApiSlice";

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const CreateQuestionPaper = () => {
  const { testSeriesId, sectionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // API hooks
  const { data: templates = [], isLoading: isLoadingTemplates } = useGetTemplatesQuery({
    testSeriesId,
    sectionId,
  });
  const [createQuestionPaper, { isLoading: isCreating }] = useCreateQuestionPaperMutation();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    templateId: "",
    description: "",
    duration: 180,
    isActive: true,
    settings: {
      shuffleQuestions: true,
      showCalculator: false,
      allowBackNavigation: true,
      showQuestionPalette: true,
      showTimer: true,
      autoSubmit: true,
      showHints: false,
      markingScheme: {
        correct: 4,
        incorrect: -1,
        skipped: 0
      }
    }
  });

  // Auto-generate title when template is selected
  const handleTemplateChange = (templateId) => {
    const selectedTemplate = templates?.find(t => t._id === templateId);
    if (selectedTemplate) {
      const cleanTitle = selectedTemplate.title
        .replace(/\s*Template\s*/i, '')
        .replace(/\s*\([^)]*\)\s*/g, '')
        .trim();
      const date = new Date();
      const formattedDate = `(${date.toLocaleDateString('en-US', { month: 'short' })} ${date.getFullYear().toString().slice(-2)})`;
      const autoTitle = `${cleanTitle} Full Test Paper ${formattedDate}`;
      setFormData(prev => ({
        ...prev,
        templateId,
        title: autoTitle,
        duration: selectedTemplate.duration || prev.duration
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!formData.templateId) {
        toast.error("Please select a template");
        return;
      }

      if (!formData.title.trim()) {
        toast.error("Please enter a title");
        return;
      }

      await createQuestionPaper({
        testSeriesId,
        sectionId,
        ...formData
      }).unwrap();

      toast.success("Question paper created successfully!");
      navigate(`/add-new-test/test-series-sections/${testSeriesId}/section/${sectionId}/question-papers`);
    } catch (error) {
      toast.error(error.data?.message || "Failed to create question paper");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <motion.div
        className="max-w-6xl mx-auto p-6 space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <DynamicBreadcrumb showBackButton={true} />
          <Button
            type="button"
            onClick={() => navigate(-1)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Question Papers
          </Button>
        </div>

        {/* Title Card */}
        <motion.div variants={itemVariants}>
          <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                Create New Question Paper
              </CardTitle>
            </CardHeader>
          </Card>
        </motion.div>

        {/* Template Selection */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Select Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingTemplates ? (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span>Loading templates...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {templates.map((template) => (
                    <button
                      key={template._id}
                      type="button"
                      onClick={() => handleTemplateChange(template._id)}
                      className={`w-full p-4 text-left border rounded-lg transition-all ${
                        formData.templateId === template._id
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                          : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                            formData.templateId === template._id
                              ? "bg-blue-500"
                              : "border-2 border-gray-300"
                          }`} />
                          <div>
                            <h3 className="font-medium text-gray-900">{template.title}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {template.duration} minutes • {template.totalQuestions} questions
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline" className="text-sm">
                            {template.difficulty}
                          </Badge>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Basic Information */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Title<span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Question Paper Title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Duration (minutes)<span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    placeholder="Duration"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, duration: parseInt(e.target.value) || 0 }))
                    }
                    required
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Description
                </label>
                <textarea
                  placeholder="Add a description for this question paper"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Advanced Settings */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* General Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(formData.settings)
                    .filter(([key]) => typeof formData.settings[key] === 'boolean')
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Switch
                          id={key}
                          checked={value}
                          onCheckedChange={(checked) =>
                            setFormData((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, [key]: checked },
                            }))
                          }
                        />
                        <label htmlFor={key} className="text-sm">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </label>
                      </div>
                    ))}
                </div>

                {/* Marking Scheme */}
                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium mb-4">Marking Scheme</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">
                        Correct Answer
                      </label>
                      <Input
                        type="number"
                        value={formData.settings.markingScheme.correct}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              markingScheme: {
                                ...prev.settings.markingScheme,
                                correct: parseFloat(e.target.value) || 0,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">
                        Incorrect Answer
                      </label>
                      <Input
                        type="number"
                        value={formData.settings.markingScheme.incorrect}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              markingScheme: {
                                ...prev.settings.markingScheme,
                                incorrect: parseFloat(e.target.value) || 0,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 mb-1 block">
                        Skipped Question
                      </label>
                      <Input
                        type="number"
                        value={formData.settings.markingScheme.skipped}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              markingScheme: {
                                ...prev.settings.markingScheme,
                                skipped: parseFloat(e.target.value) || 0,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Submit Button */}
        <motion.div variants={itemVariants} className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            disabled={isCreating}
          >
            {isCreating ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Create Question Paper
              </div>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </form>
  );
};

export default CreateQuestionPaper; 