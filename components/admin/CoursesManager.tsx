"use client";

import { useState, useEffect } from "react";
import type { CourseWithGroups, Module, Lesson } from "@/lib/actions/courses";
import {
  createCourse,
  updateCourse,
  deleteCourse,
  createModule,
  updateModule,
  deleteModule,
  getModulesByCourseId,
  getLessonsByModuleId,
  createLesson,
  updateLesson,
  deleteLesson,
} from "@/lib/actions/courses";
import { SimpleRichTextEditor } from "../documents/SimpleRichTextEditor";

interface CoursesManagerProps {
  initialCourses: CourseWithGroups[];
  allGroups: { id: string; name: string }[];
}

type ViewMode = "courses" | "modules" | "lessons";

export function CoursesManager({ initialCourses, allGroups }: CoursesManagerProps) {
  const [courses, setCourses] = useState<CourseWithGroups[]>(initialCourses);
  const [viewMode, setViewMode] = useState<ViewMode>("courses");
  const [selectedCourse, setSelectedCourse] = useState<CourseWithGroups | null>(null);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Course form state
  const [courseForm, setCourseForm] = useState({
    title: "",
    slug: "",
    description: "",
    banner_url: "",
    banner_mode: "text" as "image" | "text",
    is_published: false,
    locked_message: "",
    visibility: "show_locked" as "show_locked" | "hide",
    position: 0,
    section: "Video Training Courses",
    sequential: false,
    group_ids: [] as string[],
  });

  // Module form state
  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    position: 0,
  });

  // Lesson form state
  const [lessonForm, setLessonForm] = useState({
    title: "",
    body: "",
    video_url: "",
    attachments: [] as { name: string; url: string; type: string }[],
    position: 0,
    unlock_at: "",
  });

  // Load modules when viewing a course
  useEffect(() => {
    if (viewMode === "modules" && selectedCourse) {
      loadModules(selectedCourse.id);
    }
  }, [viewMode, selectedCourse]);

  // Load lessons when viewing a module
  useEffect(() => {
    if (viewMode === "lessons" && selectedModule) {
      loadLessons(selectedModule.id);
    }
  }, [viewMode, selectedModule]);

  async function loadModules(courseId: string) {
    setIsLoading(true);
    const data = await getModulesByCourseId(courseId);
    setModules(data);
    setIsLoading(false);
  }

  async function loadLessons(moduleId: string) {
    setIsLoading(true);
    const data = await getLessonsByModuleId(moduleId);
    setLessons(data);
    setIsLoading(false);
  }

  function openCourseForm(course?: CourseWithGroups) {
    if (course) {
      setCourseForm({
        title: course.title,
        slug: course.slug,
        description: course.description || "",
        banner_url: course.banner_url || "",
        banner_mode: course.banner_mode || "text",
        is_published: course.is_published,
        locked_message: course.locked_message || "",
        visibility: course.visibility,
        position: course.position,
        section: course.section || "Video Training Courses",
        sequential: course.sequential || false,
        group_ids: course.groups.map((g) => g.id),
      });
      setEditingItem(course);
    } else {
      setCourseForm({
        title: "",
        slug: "",
        description: "",
        banner_url: "",
        banner_mode: "text",
        is_published: false,
        locked_message: "",
        visibility: "show_locked",
        position: 0,
        section: "Video Training Courses",
        sequential: false,
        group_ids: [],
      });
      setEditingItem(null);
    }
    setIsFormOpen(true);
  }

  function openModuleForm(module?: Module) {
    if (module) {
      setModuleForm({
        title: module.title,
        description: module.description || "",
        position: module.position,
      });
      setEditingItem(module);
    } else {
      setModuleForm({
        title: "",
        description: "",
        position: modules.length,
      });
      setEditingItem(null);
    }
    setIsFormOpen(true);
  }

  function openLessonForm(lesson?: Lesson) {
    if (lesson) {
      setLessonForm({
        title: lesson.title,
        body: lesson.body || "",
        video_url: lesson.video_url || "",
        attachments: lesson.attachments || [],
        position: lesson.position,
        unlock_at: lesson.unlock_at ? new Date(lesson.unlock_at).toISOString().slice(0, 16) : "",
      });
      setEditingItem(lesson);
    } else {
      setLessonForm({
        title: "",
        body: "",
        video_url: "",
        attachments: [],
        position: lessons.length,
        unlock_at: "",
      });
      setEditingItem(null);
    }
    setIsFormOpen(true);
  }

  async function handleCourseSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingItem) {
        await updateCourse(editingItem.id, courseForm);
      } else {
        await createCourse(courseForm);
      }
      window.location.reload();
    } catch (error) {
      console.error("Error saving course:", error);
      alert("Failed to save course");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleModuleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse) return;
    setIsLoading(true);

    try {
      if (editingItem) {
        await updateModule(editingItem.id, moduleForm);
      } else {
        await createModule({
          course_id: selectedCourse.id,
          ...moduleForm,
        });
      }
      setIsFormOpen(false);
      loadModules(selectedCourse.id);
    } catch (error) {
      console.error("Error saving module:", error);
      alert("Failed to save module");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLessonSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedModule) return;
    setIsLoading(true);

    try {
      const lessonData = {
        ...lessonForm,
        unlock_at: lessonForm.unlock_at ? new Date(lessonForm.unlock_at).toISOString() : null,
      };
      
      if (editingItem) {
        await updateLesson(editingItem.id, lessonData);
      } else {
        await createLesson({
          module_id: selectedModule.id,
          ...lessonData,
        });
      }
      setIsFormOpen(false);
      loadLessons(selectedModule.id);
    } catch (error) {
      console.error("Error saving lesson:", error);
      alert("Failed to save lesson");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteCourse(id: string) {
    if (!confirm("Delete this course? This will also delete all modules and lessons.")) return;
    setIsLoading(true);
    try {
      await deleteCourse(id);
      window.location.reload();
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteModule(id: string) {
    if (!confirm("Delete this module? This will also delete all lessons.")) return;
    if (!selectedCourse) return;
    setIsLoading(true);
    try {
      await deleteModule(id);
      loadModules(selectedCourse.id);
    } catch (error) {
      console.error("Error deleting module:", error);
      alert("Failed to delete module");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm("Delete this lesson?")) return;
    if (!selectedModule) return;
    setIsLoading(true);
    try {
      await deleteLesson(id);
      loadLessons(selectedModule.id);
    } catch (error) {
      console.error("Error deleting lesson:", error);
      alert("Failed to delete lesson");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {/* Breadcrumb navigation */}
      <div className="mb-4 text-sm text-gray-600">
        <button
          onClick={() => {
            setViewMode("courses");
            setSelectedCourse(null);
            setSelectedModule(null);
          }}
          className="hover:text-blue-600"
        >
          Courses
        </button>
        {selectedCourse && (
          <>
            <span className="mx-2">/</span>
            <button
              onClick={() => {
                setViewMode("modules");
                setSelectedModule(null);
              }}
              className="hover:text-blue-600"
            >
              {selectedCourse.title}
            </button>
          </>
        )}
        {selectedModule && (
          <>
            <span className="mx-2">/</span>
            <span>{selectedModule.title}</span>
          </>
        )}
      </div>

      {/* Courses List */}
      {viewMode === "courses" && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Manage Courses</h2>
            <button
              onClick={() => openCourseForm()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              New Course
            </button>
          </div>

          <div className="space-y-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {course.title}
                      {!course.is_published && (
                        <span className="ml-2 text-sm text-gray-500">(Draft)</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Slug: <code className="bg-gray-100 px-1 rounded">{course.slug}</code>
                    </p>
                    {course.description && (
                      <p className="text-sm text-gray-600 mt-2">{course.description}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      {course.groups.map((group) => (
                        <span
                          key={group.id}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                        >
                          {group.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <a
                      href={`/dashboard/courses/${course.id}/progress`}
                      className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                    >
                      Progress
                    </a>
                    <a
                      href={`/courses/${course.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Preview
                    </a>
                    <button
                      onClick={() => {
                        setSelectedCourse(course);
                        setViewMode("modules");
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Modules
                    </button>
                    <button
                      onClick={() => openCourseForm(course)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modules List */}
      {viewMode === "modules" && selectedCourse && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Modules</h2>
            <button
              onClick={() => openModuleForm()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              New Module
            </button>
          </div>

          <div className="space-y-4">
            {modules.map((module) => (
              <div
                key={module.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                    {module.description && (
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => {
                        setSelectedModule(module);
                        setViewMode("lessons");
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Lessons
                    </button>
                    <button
                      onClick={() => openModuleForm(module)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteModule(module.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lessons List */}
      {viewMode === "lessons" && selectedModule && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Lessons</h2>
            <button
              onClick={() => openLessonForm()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              New Lesson
            </button>
          </div>

          <div className="space-y-4">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{lesson.title}</h3>
                    {lesson.video_url && (
                      <p className="text-sm text-gray-600 mt-1">
                        Video: <a href={lesson.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lesson.video_url}</a>
                      </p>
                    )}
                    {lesson.attachments && lesson.attachments.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {lesson.attachments.length} attachment(s)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => openLessonForm(lesson)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course Form Modal */}
      {isFormOpen && viewMode === "courses" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? "Edit Course" : "New Course"}
            </h3>
            <form onSubmit={handleCourseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  value={courseForm.slug}
                  onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Banner URL
                </label>
                <input
                  type="url"
                  value={courseForm.banner_url}
                  onChange={(e) => setCourseForm({ ...courseForm, banner_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 16:9 aspect ratio (e.g., 1280x720)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Banner Mode
                </label>
                <select
                  value={courseForm.banner_mode}
                  onChange={(e) => setCourseForm({ ...courseForm, banner_mode: e.target.value as "image" | "text" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="text">Title Text (gradient background, no image)</option>
                  <option value="image">Image Only (show banner_url, no title overlay)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose "Image Only" if your banner image already contains the course title
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Section
                </label>
                <input
                  type="text"
                  value={courseForm.section}
                  onChange={(e) => setCourseForm({ ...courseForm, section: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="Video Training Courses"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Group courses into sections in the catalog
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Locked Message
                </label>
                <textarea
                  value={courseForm.locked_message}
                  onChange={(e) => setCourseForm({ ...courseForm, locked_message: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Visibility
                </label>
                <select
                  value={courseForm.visibility}
                  onChange={(e) => setCourseForm({ ...courseForm, visibility: e.target.value as "show_locked" | "hide" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="show_locked">Show as Locked</option>
                  <option value="hide">Hide</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Groups
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
                  {allGroups.map((group) => (
                    <label key={group.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={courseForm.group_ids.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCourseForm({
                              ...courseForm,
                              group_ids: [...courseForm.group_ids, group.id],
                            });
                          } else {
                            setCourseForm({
                              ...courseForm,
                              group_ids: courseForm.group_ids.filter((id) => id !== group.id),
                            });
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900">{group.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={courseForm.is_published}
                    onChange={(e) => setCourseForm({ ...courseForm, is_published: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-900">Published</span>
                </label>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={courseForm.sequential}
                    onChange={(e) => setCourseForm({ ...courseForm, sequential: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-900">Sequential (lock lessons until prior lessons are completed)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Form Modal */}
      {isFormOpen && viewMode === "modules" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? "Edit Module" : "New Module"}
            </h3>
            <form onSubmit={handleModuleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={moduleForm.title}
                  onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Description
                </label>
                <textarea
                  value={moduleForm.description}
                  onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Form Modal */}
      {isFormOpen && viewMode === "lessons" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? "Edit Lesson" : "New Lesson"}
            </h3>
            <form onSubmit={handleLessonSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Body (Rich Text)
                </label>
                <SimpleRichTextEditor
                  value={lessonForm.body}
                  onChange={(value) => setLessonForm({ ...lessonForm, body: value })}
                  placeholder="Enter lesson content with HTML formatting..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Video URL (YouTube/Vimeo/Loom)
                </label>
                <input
                  type="url"
                  value={lessonForm.video_url}
                  onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Unlock At (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={lessonForm.unlock_at}
                  onChange={(e) => setLessonForm({ ...lessonForm, unlock_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When set, lesson will be locked until this date/time. Leave empty for immediate access.
                </p>
                {lessonForm.unlock_at && (
                  <button
                    type="button"
                    onClick={() => setLessonForm({ ...lessonForm, unlock_at: "" })}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                  >
                    Clear unlock date
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
