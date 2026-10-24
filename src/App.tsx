/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { TabType, Course, StudentRecord } from './types';
import { COURSES_DATA } from './data/coursesData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { CoursesScreen } from './components/CoursesScreen';
import { AdmissionScreen } from './components/AdmissionScreen';
import { VerifyStudentScreen } from './components/VerifyStudentScreen';
import { ContactScreen } from './components/ContactScreen';
import { UpiPaymentModal } from './components/UpiPaymentModal';
import { SyllabusModal } from './components/SyllabusModal';
import { VerificationCertificateModal } from './components/VerificationCertificateModal';
import { AboutModal } from './components/AboutModal';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>('ADCA');
  const [isUpiModalOpen, setIsUpiModalOpen] = useState<boolean>(false);
  const [selectedCourseForSyllabus, setSelectedCourseForSyllabus] = useState<Course | null>(null);
  const [selectedStudentForCert, setSelectedStudentForCert] = useState<StudentRecord | null>(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState<boolean>(false);

  // Navigate to admission with pre-selected course
  const handleSelectCourseForAdmission = (courseCode: string) => {
    setSelectedCourseCode(courseCode);
    setActiveTab('admission');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Open syllabus modal by course object or code
  const handleOpenSyllabusModal = (course: Course) => {
    setSelectedCourseForSyllabus(course);
  };

  const handleOpenSyllabusByCode = (courseCode: string) => {
    const found = COURSES_DATA.find(
      (c) => c.code.toLowerCase() === courseCode.toLowerCase()
    );
    if (found) {
      setSelectedCourseForSyllabus(found);
    }
  };

  // Open full certificate view
  const handleOpenCertificateModal = (student: StudentRecord) => {
    setSelectedStudentForCert(student);
  };

  return (
    <div className="bg-[#f9f9ff] text-[#111c2d] antialiased flex flex-col min-h-screen">
      {/* Fixed Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenStaffModal={() => {
          setActiveTab('admin');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAboutModal={() => setIsAboutModalOpen(true)}
      />

      {/* Main Content Area - Fully responsive on Laptop/PC (max-w-7xl) and Mobile */}
      <main className="flex flex-col relative w-full pt-[128px] sm:pt-[136px] md:pt-[144px] pb-24 md:pb-12 bg-[#f9f9ff] min-h-screen max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 transition-all">
        {activeTab === 'home' && (
          <HomeScreen
            setActiveTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenUpiModal={() => setIsUpiModalOpen(true)}
            onOpenSyllabusModal={handleOpenSyllabusByCode}
            onSelectCourseForAdmission={handleSelectCourseForAdmission}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesScreen
            onSelectCourseForAdmission={handleSelectCourseForAdmission}
            onOpenSyllabusModal={handleOpenSyllabusModal}
          />
        )}

        {activeTab === 'admission' && (
          <AdmissionScreen
            preselectedCourse={selectedCourseCode}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onViewStudentSlip={handleOpenCertificateModal}
          />
        )}

        {activeTab === 'verify' && (
          <VerifyStudentScreen
            onOpenCertificateModal={handleOpenCertificateModal}
            onOpenAdminPanel={() => {
              setActiveTab('admin');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activeTab === 'contact' && <ContactScreen />}

        {activeTab === 'admin' && (
          <AdminPanel
            onBackToPortal={() => {
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation Bar for Mobile */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Modal Dialogs */}
      <UpiPaymentModal
        isOpen={isUpiModalOpen}
        onClose={() => setIsUpiModalOpen(false)}
      />

      <SyllabusModal
        course={selectedCourseForSyllabus}
        onClose={() => setSelectedCourseForSyllabus(null)}
        onApply={handleSelectCourseForAdmission}
      />

      <VerificationCertificateModal
        student={selectedStudentForCert}
        onClose={() => setSelectedStudentForCert(null)}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        onNavigateToCourses={() => {
          setActiveTab('courses');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onNavigateToAdmission={() => {
          setActiveTab('admission');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
