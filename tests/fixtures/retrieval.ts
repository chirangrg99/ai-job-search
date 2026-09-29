import type { CandidateProfile } from "../../src/features/profile/model";
import { item, requirement } from "./fit";
import { emptyParsedJob } from "./job-descriptions";
import type { RetrievalJob } from "../../src/features/retrieval/model";
export const retrievalDate = "2026-09-29";
export const developerJob = (): RetrievalJob => ({
  asOf: retrievalDate,
  categories: ["software", "frontend"],
  parsed: {
    ...emptyParsedJob(),
    title: { text: "Frontend Developer", evidence: "Frontend Developer" },
    skills: [requirement("React"), requirement("TypeScript")],
    preferredQualifications: [
      {
        text: "Accessibility",
        evidence: "Accessibility",
        priority: "preferred",
      },
    ],
    educationRequirements: [requirement("Computer Science", "preferred")],
  },
});
export const drivingJob = (): RetrievalJob => ({
  asOf: retrievalDate,
  categories: ["driving", "delivery"],
  parsed: {
    ...emptyParsedJob(),
    title: { text: "DZ Driver", evidence: "DZ Driver" },
    licences: [requirement("Valid DZ licence")],
    skills: [requirement("Route planning")],
    responsibilities: [requirement("Customer service", "required")],
  },
});
export function mixedProfile(): CandidateProfile {
  return {
    items: [
      item("react", "fact", {
        title: "React",
        fact_type: "skill",
        sensitivity: "private",
        categories: "software, frontend",
      }),
      item("typescript", "fact", {
        title: "TypeScript",
        fact_type: "skill",
        categories: "software",
      }),
      item("accessibility", "fact", {
        title: "Accessibility",
        fact_type: "skill",
        categories: "frontend",
      }),
      item("developer", "experience", {
        title: "Frontend Developer",
        company: "Example Software",
        start_date: "2022-01",
        end_date: "2025-12",
        currently_employed: false,
        categories: "software, frontend",
      }),
      item("react-bullet", "bullet", {
        experience_id: "developer",
        original_text:
          "Delivered React interfaces and reduced load time by 20%.",
        skills: "React",
        categories: "frontend",
      }),
      item("project", "project", {
        name: "Customer portal",
        description: "React and TypeScript portal",
        technologies: "React, TypeScript",
        achievements: "Improved load time by 15%",
        categories: "software",
      }),
      item("education", "education", {
        institution: "Example College",
        credential: "Diploma",
        field_of_study: "Computer Science",
      }),
      item("dz", "credential", {
        title: "DZ licence",
        fact_type: "licence",
        valid_from: "2020-01-01",
        valid_to: "2030-01-01",
        categories: "driving",
      }),
      item("route", "fact", {
        title: "Route planning",
        fact_type: "skill",
        categories: "driving, delivery",
      }),
      item("driver", "experience", {
        title: "DZ Driver",
        company: "Example Logistics",
        start_date: "2018-01",
        end_date: "2021-12",
        categories: "driving",
      }),
      item("driving-bullet", "bullet", {
        experience_id: "driver",
        original_text: "Completed delivery routes and vehicle checks.",
        skills: "Route planning",
        categories: "driving",
      }),
      item("service-bullet", "bullet", {
        experience_id: "driver",
        original_text:
          "Provided customer service during deliveries and resolved complaints.",
        skills: "Customer service",
        categories: "driving, customer service",
      }),
      item("forklift", "credential", {
        title: "Forklift certification",
        fact_type: "certification",
        categories: "warehouse",
      }),
      item("unverified", "fact", { title: "React", fact_type: "skill" }, false),
      item("sensitive", "fact", {
        title: "React",
        description: "Private health details",
        sensitivity: "sensitive",
      }),
      item("personal", "personal", {
        full_name: "Test Person",
        email: "private@example.test",
      }),
      item("summary", "summary", {
        professional_summary: "React expert and DZ driver",
      }),
    ],
  };
}
