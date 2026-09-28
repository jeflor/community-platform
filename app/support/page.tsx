import Link from "next/link";
import { getSiteName } from "@/lib/settings/get-site-name";
import { getSupportEmail } from "@/lib/settings/get-support-email";

export default async function SupportPage() {
  const siteName = await getSiteName();
  const supportEmail = await getSupportEmail();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Support</h1>
        <p className="text-gray-600">
          Get help, find answers, and connect with our community resources
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Contact Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-2xl">💬</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Contact Us</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Get in touch with our team for personalized assistance
          </p>
          <div className="space-y-2">
            <Link
              href="/dashboard/messages"
              className="block w-full text-center px-4 py-2.5 rounded-lg font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "#1E3A7A" }}
            >
              Message the Team
            </Link>
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="block w-full text-center px-4 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
              >
                Email Support
              </a>
            )}
          </div>
        </div>

        {/* Resources Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Resources</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Browse guides, documents, and helpful materials
          </p>
          <Link
            href="/resources"
            className="block w-full text-center px-4 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            View All Resources
          </Link>
        </div>

        {/* Community Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <span className="text-2xl">👥</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Community</h2>
          </div>
          <p className="text-gray-600 text-sm mb-4">
            Connect with other members and join events
          </p>
          <div className="space-y-2">
            <Link
              href="/dashboard/members"
              className="block w-full text-center px-4 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
            >
              Member Directory
            </Link>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-lg shadow p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              How do I update my profile?
            </h3>
            <p className="text-gray-600">
              Visit the{" "}
              <Link href="/dashboard/members" className="text-blue-600 hover:text-blue-700 underline">
                Members
              </Link>{" "}
              page and click on your profile, then select "Edit Profile" to update your information.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              How do I access courses and events?
            </h3>
            <p className="text-gray-600">
              Navigate to{" "}
              <Link href="/courses" className="text-blue-600 hover:text-blue-700 underline">
                Video Courses
              </Link>{" "}
              from the top menu to browse available courses, or visit{" "}
              <Link href="/dashboard/events" className="text-blue-600 hover:text-blue-700 underline">
                Events
              </Link>{" "}
              to see upcoming community events.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Where can I find community guidelines?
            </h3>
            <p className="text-gray-600">
              Please review our{" "}
              <Link 
                href="/resources/code-of-conduct" 
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Code of Conduct
              </Link>{" "}
              to understand our community standards and expectations for respectful interaction.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              How do I message other members?
            </h3>
            <p className="text-gray-600">
              Use the{" "}
              <Link href="/dashboard/messages" className="text-blue-600 hover:text-blue-700 underline">
                Messages
              </Link>{" "}
              feature to communicate with the team. Direct member-to-member messaging may be available depending on your community settings.
            </p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              I'm having technical issues. What should I do?
            </h3>
            <p className="text-gray-600">
              For technical problems, please contact our support team using the "Message the Team" button above. 
              Include details about the issue, what you were trying to do, and any error messages you received.
            </p>
          </div>
        </div>
      </div>

      {/* Important Links */}
      <div className="bg-white rounded-lg shadow p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Important Links
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/resources/code-of-conduct"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition"
          >
            <span className="text-2xl">📋</span>
            <div>
              <div className="font-medium text-gray-900">Code of Conduct</div>
              <div className="text-sm text-gray-600">Community guidelines</div>
            </div>
          </Link>

          <Link
            href="/dashboard/events"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition"
          >
            <span className="text-2xl">📅</span>
            <div>
              <div className="font-medium text-gray-900">Events</div>
              <div className="text-sm text-gray-600">Upcoming community events</div>
            </div>
          </Link>

          <Link
            href="/resources"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition"
          >
            <span className="text-2xl">📚</span>
            <div>
              <div className="font-medium text-gray-900">Resources</div>
              <div className="text-sm text-gray-600">Helpful guides and documents</div>
            </div>
          </Link>

          <Link
            href="/dashboard/account"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition"
          >
            <span className="text-2xl">⚙️</span>
            <div>
              <div className="font-medium text-gray-900">Account Settings</div>
              <div className="text-sm text-gray-600">Manage your preferences</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Help Tip */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Get the Best Support</h3>
            <p className="text-sm text-blue-800">
              When reaching out for help, include as much detail as possible about your question or issue. 
              Screenshots, error messages, and step-by-step descriptions help us assist you faster.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
