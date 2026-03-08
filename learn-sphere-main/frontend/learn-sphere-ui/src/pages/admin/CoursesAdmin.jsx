import React, { useEffect, useState, useRef } from "react";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AssessmentForm from "./AssessmentForm";
import QuizManager from "../../components/admin/courses/QuizManager";
import CourseContentViewer from "../../components/admin/courses/CourseContentViewer";
import {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../../components/admin/CourseApi";
import { courseApi } from "../../api/courseApi";

import CourseStructureManager from "../../components/admin/courses/CourseStructureManager";
import CourseForm from "../../components/admin/courses/CourseForm";
import CourseList from "../../components/admin/courses/CourseList";
import { normalizeSlug } from "../../components/admin/courses/slug";
import { validateCourse } from "../../components/admin/courses/validators";

const CATEGORY_OPTIONS = [
  "Web Development",
  "Mobile Development",
  "Data Science",
  "Machine Learning",
  "UI/UX Design",
  "DevOps",
  "Cloud Computing",
  "Cybersecurity",
  "Database Design",
  "AI & Chatbots",
  "Blockchain",
  "Game Development",
  "Business",
  "Marketing",
  "Languages",
];

export default function CoursesAdmin() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // id or "new"
  const [activeTab, setActiveTab] = useState("details");
  const [viewingCourse, setViewingCourse] = useState(null);
  const [courseStructure, setCourseStructure] = useState(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    summary: "",
    description: "",
    thumbnail: "",
    categories: [],
    duration: "",
    level: "beginner",
    price: 0,
    students: 0,
    status: "published",
  });

  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [justCreatedId, setJustCreatedId] = useState(null);
  const newCardRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      const data = await getAllCourses();
      setCourses(data);
      setLoading(false);
    };
    init();
  }, []);

  const onEdit = (course) => {
    setEditing(course.id);
    setActiveTab("details");
    setCourseStructure(null);
    setForm({
      ...course,
      categories: Array.isArray(course.categories) ? course.categories : [],
    });
    // Load structure for Quiz Manager and Assessment
    courseApi
      .getStructure(course.id)
      .then(setCourseStructure)
      .catch(() => {});
  };

  // When switching to Quizzes or Assessment tab, re-fetch structure to ensure it's fresh
  useEffect(() => {
    if (
      (activeTab === "quizzes" || activeTab === "assessment") &&
      editing &&
      editing !== "new"
    ) {
      courseApi
        .getStructure(editing)
        .then(setCourseStructure)
        .catch(() => {});
    }
  }, [activeTab, editing]);

  const onViewContent = (course) => {
    setViewingCourse(course);
  };

  const onCancel = () => {
    setEditing(null);
    setActiveTab("details");
    setErrors({});
    setMessage("");
    setCourseStructure(null);
    setForm({
      title: "",
      slug: "",
      summary: "",
      description: "",
      thumbnail: "",
      categories: [],
      duration: "",
      level: "beginner",
      price: 0,
      students: 0,
      status: "published",
    });
  };

  const onSave = async () => {
    setMessage("");
    const errs = validateCourse(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      setMessage("Please fix the highlighted errors.");
      return;
    }

    try {
      if (editing && editing !== "new") {
        await updateCourse(editing, form);
        const data = await getAllCourses();
        setCourses(data);
        setMessage("Course progress saved.");
      } else {
        const created = await createCourse({
          ...form,
          slug: normalizeSlug(form.slug || form.title),
        });
        setCourses((prev) => [created, ...prev]);
        setMessage(
          "Course Created Successfully. You can now manage its structure.",
        );
        setEditing(created.id);
        setJustCreatedId(created.id);
        // Load structure for quiz manager
        courseApi
          .getStructure(created.id)
          .then(setCourseStructure)
          .catch(() => {});
        setActiveTab("structure");
      }
    } catch (e) {
      setMessage(e?.message || "Something went wrong.");
    }
  };

  const onFinalize = async () => {
    try {
      await onSave();
      onCancel();
      setMessage("Course, Structure, and Assessments finalized safely.");
    } catch (e) {
      setMessage("Failed to finalize: " + e.message);
    }
  };

  const onDelete = async (id) => {
    if (window.confirm("Delete this course and its assessment?")) {
      await deleteCourse(id);
      setCourses(await getAllCourses());
      setMessage("Course deleted.");
    }
  };

  const canSave = form.title.trim() && form.slug.trim() && form.summary.trim();

  if (loading)
    return <div className="app-shell p-10 text-white">Loading Sphere...</div>;

  return (
    <div className="app-shell flex min-h-screen bg-gray-950 text-white">
      <AdminSidebar />

      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {editing
              ? activeTab === "details"
                ? "Course Editor"
                : activeTab === "structure"
                  ? "Structure Manager"
                  : activeTab === "assessment"
                    ? "Assessment Lab"
                    : "Quizzes Builder"
              : "Course Management"}
          </h1>
          {!editing && (
            <button
              onClick={() => setEditing("new")}
              className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all"
            >
              Create Course
            </button>
          )}
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold">
            {message}
          </div>
        )}

        {editing ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xl">
            {/* Tabs */}
            <div className="flex bg-slate-900/50 border-b border-[var(--border)] overflow-x-auto">
              {[
                { id: "details", label: "1. Course Details" },
                { id: "structure", label: "2. Structure Management" },
                { id: "assessment", label: "3. Assessment / MCQ" },
                { id: "quizzes", label: "4. Quizzes" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-8 py-4 text-sm whitespace-nowrap font-medium transition-all ${
                    activeTab === tab.id
                      ? "text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5"
                      : "text-slate-400 hover:text-slate-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {activeTab === "details" ? (
                <div>
                  <CourseForm
                    form={form}
                    setForm={setForm}
                    errors={errors}
                    editing={editing}
                    onSave={onSave}
                    onCancel={onCancel}
                    categoryOptions={CATEGORY_OPTIONS}
                    canSave={canSave}
                    titleRef={titleRef}
                  />
                  <div className="mt-8 pt-6 border-t border-[var(--border)] flex justify-end gap-3">
                    <button
                      onClick={onCancel}
                      className="px-8 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-white font-medium text-sm transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onSave}
                      className="px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all"
                    >
                      {editing === "new" ? "Create & Next" : "Save Changes"}
                    </button>
                  </div>
                </div>
              ) : activeTab === "structure" ? (
                <div>
                  <CourseStructureManager
                    courseId={editing}
                    isEmbedded={true}
                  />
                  <div className="mt-10 pt-6 border-t border-[var(--border)] flex gap-3">
                    <button
                      onClick={() => setActiveTab("details")}
                      className="flex-1 px-8 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-white font-medium text-sm transition-all"
                    >
                      Back to Details
                    </button>
                    <button
                      onClick={() => setActiveTab("assessment")}
                      className="flex-[2] px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all"
                    >
                      Setup Assessment
                    </button>
                  </div>
                </div>
              ) : activeTab === "assessment" ? (
                <div>
                  <AssessmentForm
                    courseId={editing !== "new" ? editing : null}
                    onSaved={() => setMessage("Assessment saved successfully.")}
                  />
                  <div className="mt-10 pt-6 border-t border-[var(--border)] flex gap-3">
                    <button
                      onClick={() => setActiveTab("structure")}
                      className="flex-1 px-8 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-white font-medium text-sm transition-all"
                    >
                      Back to Structure
                    </button>
                    <button
                      onClick={() => setActiveTab("quizzes")}
                      className="flex-[2] px-8 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all"
                    >
                      Setup Quizzes
                    </button>
                  </div>
                </div>
              ) : (
                // ✅ Quizzes tab — per-chapter quiz management
                <div>
                  <QuizManager
                    courseId={editing !== "new" ? editing : null}
                    structure={courseStructure}
                  />
                  <div className="mt-10 pt-6 border-t border-[var(--border)] flex gap-3">
                    <button
                      onClick={() => setActiveTab("assessment")}
                      className="flex-1 px-8 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-white font-medium text-sm transition-all"
                    >
                      Back to Assessment
                    </button>
                    <button
                      onClick={onFinalize}
                      className="flex-[2] px-8 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm transition-all"
                    >
                      Finalize Course
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <CourseList
            courses={courses}
            justCreatedId={justCreatedId}
            newCardRef={newCardRef}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewContent={onViewContent}
          />
        )}
      </main>

      {viewingCourse && (
        <CourseContentViewer
          course={viewingCourse}
          onClose={() => setViewingCourse(null)}
        />
      )}
    </div>
  );
}
