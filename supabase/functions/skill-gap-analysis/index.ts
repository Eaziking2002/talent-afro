import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Comprehensive skill database with real courses and certifications
const skillDatabase: Record<string, {
  category: string;
  demand: "high" | "medium" | "low";
  avgSalaryBoost: number;
  relatedSkills: string[];
  certifications: { name: string; provider: string; url: string; difficulty: string }[];
  courses: { name: string; provider: string; url: string; duration: string; level: string }[];
}> = {
  "javascript": {
    category: "Programming",
    demand: "high",
    avgSalaryBoost: 15,
    relatedSkills: ["typescript", "react", "node.js", "vue.js"],
    certifications: [
      { name: "JavaScript Developer Certificate", provider: "W3Schools", url: "https://www.w3schools.com/cert/cert_javascript.asp", difficulty: "Beginner" },
      { name: "Professional JavaScript Developer", provider: "OpenJS Foundation", url: "https://openjsf.org/certification/", difficulty: "Advanced" }
    ],
    courses: [
      { name: "The Complete JavaScript Course 2024", provider: "Udemy", url: "https://www.udemy.com/course/the-complete-javascript-course/", duration: "69 hours", level: "Beginner" },
      { name: "JavaScript: The Advanced Concepts", provider: "Udemy", url: "https://www.udemy.com/course/advanced-javascript-concepts/", duration: "25 hours", level: "Advanced" }
    ]
  },
  "typescript": {
    category: "Programming",
    demand: "high",
    avgSalaryBoost: 20,
    relatedSkills: ["javascript", "react", "angular", "node.js"],
    certifications: [
      { name: "TypeScript Certification", provider: "Microsoft", url: "https://learn.microsoft.com/en-us/certifications/", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "Understanding TypeScript", provider: "Udemy", url: "https://www.udemy.com/course/understanding-typescript/", duration: "15 hours", level: "Intermediate" },
      { name: "TypeScript: The Complete Developer's Guide", provider: "Udemy", url: "https://www.udemy.com/course/typescript-the-complete-developers-guide/", duration: "27 hours", level: "Beginner" }
    ]
  },
  "python": {
    category: "Programming",
    demand: "high",
    avgSalaryBoost: 25,
    relatedSkills: ["django", "flask", "machine learning", "data science"],
    certifications: [
      { name: "PCEP - Certified Entry-Level Python Programmer", provider: "Python Institute", url: "https://pythoninstitute.org/pcep", difficulty: "Beginner" },
      { name: "PCAP - Certified Associate Python Programmer", provider: "Python Institute", url: "https://pythoninstitute.org/pcap", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "100 Days of Code: Python Pro Bootcamp", provider: "Udemy", url: "https://www.udemy.com/course/100-days-of-code/", duration: "60 hours", level: "Beginner" },
      { name: "Python for Data Science and Machine Learning", provider: "Udemy", url: "https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/", duration: "25 hours", level: "Intermediate" }
    ]
  },
  "react": {
    category: "Frontend",
    demand: "high",
    avgSalaryBoost: 22,
    relatedSkills: ["javascript", "typescript", "redux", "next.js"],
    certifications: [
      { name: "Meta Front-End Developer Certificate", provider: "Meta/Coursera", url: "https://www.coursera.org/professional-certificates/meta-front-end-developer", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "React - The Complete Guide 2024", provider: "Udemy", url: "https://www.udemy.com/course/react-the-complete-guide-incl-redux/", duration: "68 hours", level: "Beginner" },
      { name: "Advanced React and Redux", provider: "Udemy", url: "https://www.udemy.com/course/react-redux-tutorial/", duration: "21 hours", level: "Advanced" }
    ]
  },
  "node.js": {
    category: "Backend",
    demand: "high",
    avgSalaryBoost: 20,
    relatedSkills: ["javascript", "express.js", "mongodb", "postgresql"],
    certifications: [
      { name: "OpenJS Node.js Application Developer", provider: "Linux Foundation", url: "https://training.linuxfoundation.org/certification/jsnad/", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "The Complete Node.js Developer Course", provider: "Udemy", url: "https://www.udemy.com/course/the-complete-nodejs-developer-course-2/", duration: "35 hours", level: "Beginner" },
      { name: "Node.js, Express, MongoDB & More", provider: "Udemy", url: "https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/", duration: "42 hours", level: "Intermediate" }
    ]
  },
  "aws": {
    category: "Cloud",
    demand: "high",
    avgSalaryBoost: 30,
    relatedSkills: ["docker", "kubernetes", "terraform", "devops"],
    certifications: [
      { name: "AWS Certified Cloud Practitioner", provider: "Amazon", url: "https://aws.amazon.com/certification/certified-cloud-practitioner/", difficulty: "Beginner" },
      { name: "AWS Solutions Architect Associate", provider: "Amazon", url: "https://aws.amazon.com/certification/certified-solutions-architect-associate/", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "Ultimate AWS Certified Cloud Practitioner", provider: "Udemy", url: "https://www.udemy.com/course/aws-certified-cloud-practitioner-new/", duration: "15 hours", level: "Beginner" },
      { name: "AWS Certified Solutions Architect Associate", provider: "Udemy", url: "https://www.udemy.com/course/aws-certified-solutions-architect-associate-saa-c03/", duration: "27 hours", level: "Intermediate" }
    ]
  },
  "docker": {
    category: "DevOps",
    demand: "high",
    avgSalaryBoost: 18,
    relatedSkills: ["kubernetes", "aws", "ci/cd", "linux"],
    certifications: [
      { name: "Docker Certified Associate", provider: "Docker", url: "https://www.docker.com/certification/", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "Docker Mastery: with Kubernetes +Swarm", provider: "Udemy", url: "https://www.udemy.com/course/docker-mastery/", duration: "20 hours", level: "Beginner" },
      { name: "Docker and Kubernetes: The Complete Guide", provider: "Udemy", url: "https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/", duration: "22 hours", level: "Intermediate" }
    ]
  },
  "sql": {
    category: "Database",
    demand: "high",
    avgSalaryBoost: 15,
    relatedSkills: ["postgresql", "mysql", "mongodb", "data analysis"],
    certifications: [
      { name: "Oracle Database SQL Certified Associate", provider: "Oracle", url: "https://education.oracle.com/", difficulty: "Intermediate" },
      { name: "Microsoft Azure Data Fundamentals", provider: "Microsoft", url: "https://learn.microsoft.com/en-us/certifications/azure-data-fundamentals/", difficulty: "Beginner" }
    ],
    courses: [
      { name: "The Complete SQL Bootcamp", provider: "Udemy", url: "https://www.udemy.com/course/the-complete-sql-bootcamp/", duration: "9 hours", level: "Beginner" },
      { name: "SQL and PostgreSQL: The Complete Developer's Guide", provider: "Udemy", url: "https://www.udemy.com/course/sql-and-postgresql/", duration: "22 hours", level: "Intermediate" }
    ]
  },
  "machine learning": {
    category: "AI/ML",
    demand: "high",
    avgSalaryBoost: 35,
    relatedSkills: ["python", "tensorflow", "data science", "deep learning"],
    certifications: [
      { name: "TensorFlow Developer Certificate", provider: "Google", url: "https://www.tensorflow.org/certificate", difficulty: "Advanced" },
      { name: "AWS Machine Learning Specialty", provider: "Amazon", url: "https://aws.amazon.com/certification/certified-machine-learning-specialty/", difficulty: "Advanced" }
    ],
    courses: [
      { name: "Machine Learning A-Z", provider: "Udemy", url: "https://www.udemy.com/course/machinelearning/", duration: "44 hours", level: "Beginner" },
      { name: "Machine Learning Specialization", provider: "Coursera", url: "https://www.coursera.org/specializations/machine-learning-introduction", duration: "3 months", level: "Intermediate" }
    ]
  },
  "data science": {
    category: "Data",
    demand: "high",
    avgSalaryBoost: 30,
    relatedSkills: ["python", "sql", "machine learning", "statistics", "tableau"],
    certifications: [
      { name: "IBM Data Science Professional Certificate", provider: "IBM/Coursera", url: "https://www.coursera.org/professional-certificates/ibm-data-science", difficulty: "Intermediate" },
      { name: "Google Data Analytics Certificate", provider: "Google/Coursera", url: "https://www.coursera.org/professional-certificates/google-data-analytics", difficulty: "Beginner" }
    ],
    courses: [
      { name: "The Data Science Course 2024", provider: "Udemy", url: "https://www.udemy.com/course/the-data-science-course-complete-data-science-bootcamp/", duration: "29 hours", level: "Beginner" },
      { name: "Python for Data Science and Machine Learning", provider: "Udemy", url: "https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/", duration: "25 hours", level: "Intermediate" }
    ]
  },
  "ui/ux design": {
    category: "Design",
    demand: "high",
    avgSalaryBoost: 20,
    relatedSkills: ["figma", "adobe xd", "user research", "prototyping"],
    certifications: [
      { name: "Google UX Design Professional Certificate", provider: "Google/Coursera", url: "https://www.coursera.org/professional-certificates/google-ux-design", difficulty: "Beginner" }
    ],
    courses: [
      { name: "Complete Web & Mobile Designer in 2024", provider: "Udemy", url: "https://www.udemy.com/course/complete-web-designer-mobile-designer-zero-to-mastery/", duration: "32 hours", level: "Beginner" },
      { name: "UI/UX Design Bootcamp", provider: "Udemy", url: "https://www.udemy.com/course/ui-ux-web-design-using-adobe-xd/", duration: "20 hours", level: "Intermediate" }
    ]
  },
  "figma": {
    category: "Design Tools",
    demand: "high",
    avgSalaryBoost: 15,
    relatedSkills: ["ui/ux design", "prototyping", "web design"],
    certifications: [],
    courses: [
      { name: "Figma UI UX Design Essentials", provider: "Udemy", url: "https://www.udemy.com/course/figma-ux-ui-design-user-experience-tutorial-course/", duration: "12 hours", level: "Beginner" },
      { name: "Learn Figma - UI/UX Design Essential Training", provider: "LinkedIn Learning", url: "https://www.linkedin.com/learning/figma-essential-training-the-basics", duration: "3 hours", level: "Beginner" }
    ]
  },
  "cybersecurity": {
    category: "Security",
    demand: "high",
    avgSalaryBoost: 35,
    relatedSkills: ["networking", "linux", "penetration testing", "cloud security"],
    certifications: [
      { name: "CompTIA Security+", provider: "CompTIA", url: "https://www.comptia.org/certifications/security", difficulty: "Intermediate" },
      { name: "Certified Ethical Hacker (CEH)", provider: "EC-Council", url: "https://www.eccouncil.org/programs/certified-ethical-hacker-ceh/", difficulty: "Advanced" },
      { name: "CISSP", provider: "ISC2", url: "https://www.isc2.org/Certifications/CISSP", difficulty: "Advanced" }
    ],
    courses: [
      { name: "The Complete Cyber Security Course", provider: "Udemy", url: "https://www.udemy.com/course/the-complete-internet-security-privacy-course-volume-1/", duration: "12 hours", level: "Beginner" },
      { name: "CompTIA Security+ (SY0-701) Complete Course", provider: "Udemy", url: "https://www.udemy.com/course/securityplus/", duration: "25 hours", level: "Intermediate" }
    ]
  },
  "project management": {
    category: "Management",
    demand: "medium",
    avgSalaryBoost: 25,
    relatedSkills: ["agile", "scrum", "leadership", "communication"],
    certifications: [
      { name: "PMP Certification", provider: "PMI", url: "https://www.pmi.org/certifications/project-management-pmp", difficulty: "Advanced" },
      { name: "Google Project Management Certificate", provider: "Google/Coursera", url: "https://www.coursera.org/professional-certificates/google-project-management", difficulty: "Beginner" },
      { name: "CAPM Certification", provider: "PMI", url: "https://www.pmi.org/certifications/certified-associate-capm", difficulty: "Beginner" }
    ],
    courses: [
      { name: "PMP Exam Prep Seminar", provider: "Udemy", url: "https://www.udemy.com/course/pmp-pmbok6-35-pdus/", duration: "35 hours", level: "Advanced" },
      { name: "Project Management Fundamentals", provider: "LinkedIn Learning", url: "https://www.linkedin.com/learning/project-management-foundations", duration: "3 hours", level: "Beginner" }
    ]
  },
  "agile": {
    category: "Methodology",
    demand: "medium",
    avgSalaryBoost: 15,
    relatedSkills: ["scrum", "project management", "kanban", "jira"],
    certifications: [
      { name: "Certified ScrumMaster (CSM)", provider: "Scrum Alliance", url: "https://www.scrumalliance.org/get-certified/scrum-master-track/certified-scrummaster", difficulty: "Intermediate" },
      { name: "Professional Scrum Master I (PSM I)", provider: "Scrum.org", url: "https://www.scrum.org/assessments/professional-scrum-master-i-certification", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "Agile Crash Course", provider: "Udemy", url: "https://www.udemy.com/course/agile-crash-course/", duration: "3 hours", level: "Beginner" },
      { name: "Scrum Certification Prep + Scrum Master + Agile", provider: "Udemy", url: "https://www.udemy.com/course/scrum-certification/", duration: "7 hours", level: "Intermediate" }
    ]
  },
  "digital marketing": {
    category: "Marketing",
    demand: "high",
    avgSalaryBoost: 18,
    relatedSkills: ["seo", "social media marketing", "google ads", "content marketing"],
    certifications: [
      { name: "Google Digital Marketing & E-commerce Certificate", provider: "Google/Coursera", url: "https://www.coursera.org/professional-certificates/google-digital-marketing-ecommerce", difficulty: "Beginner" },
      { name: "Meta Marketing Analytics Certificate", provider: "Meta/Coursera", url: "https://www.coursera.org/professional-certificates/facebook-marketing-analytics", difficulty: "Intermediate" },
      { name: "HubSpot Inbound Marketing", provider: "HubSpot", url: "https://academy.hubspot.com/courses/inbound-marketing", difficulty: "Beginner" }
    ],
    courses: [
      { name: "The Complete Digital Marketing Course", provider: "Udemy", url: "https://www.udemy.com/course/learn-digital-marketing-course/", duration: "22 hours", level: "Beginner" },
      { name: "Digital Marketing Masterclass", provider: "Udemy", url: "https://www.udemy.com/course/digital-marketing-masterclass/", duration: "35 hours", level: "Intermediate" }
    ]
  },
  "seo": {
    category: "Marketing",
    demand: "high",
    avgSalaryBoost: 15,
    relatedSkills: ["digital marketing", "content writing", "google analytics", "sem"],
    certifications: [
      { name: "Google Analytics Certification", provider: "Google", url: "https://skillshop.google.com/", difficulty: "Beginner" },
      { name: "SEMrush SEO Certification", provider: "SEMrush", url: "https://www.semrush.com/academy/courses/seo-fundamentals-course/", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "SEO 2024: Complete SEO Training + SEO for WordPress", provider: "Udemy", url: "https://www.udemy.com/course/seo-training-link-building-content-seo-keyword-research/", duration: "18 hours", level: "Beginner" },
      { name: "Advanced SEO Tactics", provider: "LinkedIn Learning", url: "https://www.linkedin.com/learning/advanced-seo-content-marketing", duration: "2 hours", level: "Advanced" }
    ]
  },
  "content writing": {
    category: "Content",
    demand: "medium",
    avgSalaryBoost: 12,
    relatedSkills: ["seo", "copywriting", "blogging", "social media"],
    certifications: [
      { name: "HubSpot Content Marketing Certification", provider: "HubSpot", url: "https://academy.hubspot.com/courses/content-marketing", difficulty: "Beginner" }
    ],
    courses: [
      { name: "Content Writing Masterclass", provider: "Udemy", url: "https://www.udemy.com/course/content-marketing-copywriting-write-compelling-content/", duration: "6 hours", level: "Beginner" },
      { name: "Copywriting Secrets", provider: "Udemy", url: "https://www.udemy.com/course/copywriting-secrets/", duration: "8 hours", level: "Intermediate" }
    ]
  },
  "mobile development": {
    category: "Mobile",
    demand: "high",
    avgSalaryBoost: 22,
    relatedSkills: ["react native", "flutter", "ios", "android", "kotlin", "swift"],
    certifications: [
      { name: "Google Associate Android Developer", provider: "Google", url: "https://developers.google.com/certification/associate-android-developer", difficulty: "Intermediate" },
      { name: "Meta React Native Specialization", provider: "Meta/Coursera", url: "https://www.coursera.org/specializations/meta-react-native", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "React Native - The Practical Guide", provider: "Udemy", url: "https://www.udemy.com/course/react-native-the-practical-guide/", duration: "28 hours", level: "Intermediate" },
      { name: "Flutter & Dart - The Complete Guide", provider: "Udemy", url: "https://www.udemy.com/course/learn-flutter-dart-to-build-ios-android-apps/", duration: "42 hours", level: "Beginner" }
    ]
  },
  "blockchain": {
    category: "Emerging Tech",
    demand: "medium",
    avgSalaryBoost: 30,
    relatedSkills: ["solidity", "ethereum", "smart contracts", "web3"],
    certifications: [
      { name: "Certified Blockchain Developer", provider: "Blockchain Council", url: "https://www.blockchain-council.org/certifications/certified-blockchain-developer/", difficulty: "Advanced" }
    ],
    courses: [
      { name: "Blockchain and Bitcoin Fundamentals", provider: "Udemy", url: "https://www.udemy.com/course/blockchain-and-bitcoin-fundamentals/", duration: "3 hours", level: "Beginner" },
      { name: "Ethereum and Solidity Developer", provider: "Udemy", url: "https://www.udemy.com/course/ethereum-and-solidity-the-complete-developers-guide/", duration: "24 hours", level: "Intermediate" }
    ]
  },
  "excel": {
    category: "Productivity",
    demand: "medium",
    avgSalaryBoost: 10,
    relatedSkills: ["data analysis", "vba", "power bi", "sql"],
    certifications: [
      { name: "Microsoft Office Specialist: Excel", provider: "Microsoft", url: "https://learn.microsoft.com/en-us/certifications/mos-excel-expert-2019/", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "Microsoft Excel - Excel from Beginner to Advanced", provider: "Udemy", url: "https://www.udemy.com/course/microsoft-excel-2013-from-beginner-to-advanced-and-beyond/", duration: "18 hours", level: "Beginner" },
      { name: "Excel Skills for Business Specialization", provider: "Coursera", url: "https://www.coursera.org/specializations/excel", duration: "6 months", level: "Beginner" }
    ]
  },
  "graphic design": {
    category: "Design",
    demand: "medium",
    avgSalaryBoost: 15,
    relatedSkills: ["adobe photoshop", "adobe illustrator", "canva", "branding"],
    certifications: [
      { name: "Adobe Certified Professional", provider: "Adobe", url: "https://www.adobe.com/products/photoshop.html", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "Graphic Design Masterclass", provider: "Udemy", url: "https://www.udemy.com/course/graphic-design-masterclass-everything-you-need-to-know/", duration: "29 hours", level: "Beginner" },
      { name: "Adobe Photoshop CC – Essentials Training", provider: "Udemy", url: "https://www.udemy.com/course/adobe-photoshop-cc-essentials-training-course/", duration: "13 hours", level: "Beginner" }
    ]
  },
  "video editing": {
    category: "Media",
    demand: "medium",
    avgSalaryBoost: 15,
    relatedSkills: ["adobe premiere", "after effects", "davinci resolve", "motion graphics"],
    certifications: [
      { name: "Adobe Certified Professional in Video Design", provider: "Adobe", url: "https://www.adobe.com/products/premiere.html", difficulty: "Intermediate" }
    ],
    courses: [
      { name: "Video Editing with Adobe Premiere Pro", provider: "Udemy", url: "https://www.udemy.com/course/adobe-premiere-pro-video-editing/", duration: "15 hours", level: "Beginner" },
      { name: "DaVinci Resolve Masterclass", provider: "Udemy", url: "https://www.udemy.com/course/davinci-resolve-video-editing/", duration: "20 hours", level: "Beginner" }
    ]
  }
};

// High-demand skills that boost earnings
const highDemandSkills = [
  "machine learning", "aws", "cybersecurity", "data science", "python",
  "react", "typescript", "docker", "kubernetes", "blockchain", "mobile development"
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { userSkills, highPayingJobs, profileId } = await req.json();

    console.log("Analyzing skill gaps (rule-based) for user with skills:", userSkills);

    const normalizedUserSkills = (userSkills || []).map((s: string) => s.toLowerCase().trim());
    
    // Analyze skill demand from jobs
    const skillDemand: Record<string, { count: number; totalBudget: number; jobs: string[] }> = {};
    
    (highPayingJobs || []).forEach((job: any) => {
      const skills = Array.isArray(job.skills) ? job.skills : [];
      skills.forEach((skill: string) => {
        const normalized = skill.toLowerCase().trim();
        if (!skillDemand[normalized]) {
          skillDemand[normalized] = { count: 0, totalBudget: 0, jobs: [] };
        }
        skillDemand[normalized].count++;
        skillDemand[normalized].totalBudget += job.budget || 0;
        if (skillDemand[normalized].jobs.length < 3) {
          skillDemand[normalized].jobs.push(job.title);
        }
      });
    });

    // Find skill gaps with detailed info
    const gapAnalysis: any[] = [];
    const matchedSkills: string[] = [];

    // Check skills from job market
    Object.entries(skillDemand)
      .sort((a, b) => b[1].totalBudget - a[1].totalBudget)
      .forEach(([skill, data]) => {
        const hasSkill = normalizedUserSkills.some((us: string) => 
          us === skill || us.includes(skill) || skill.includes(us)
        );

        if (hasSkill) {
          matchedSkills.push(skill);
        } else {
          // Get info from our database or generate basic info
          const skillInfo = skillDatabase[skill];
          
          gapAnalysis.push({
            skill,
            demandLevel: skillInfo?.demand || (data.count > 10 ? "high" : data.count > 5 ? "medium" : "low"),
            category: skillInfo?.category || "General",
            averageSalaryBoost: skillInfo?.avgSalaryBoost || Math.round(data.totalBudget / Math.max(data.count, 1) / 100) * 5,
            matchingJobs: data.count,
            sampleJobs: data.jobs,
            certifications: skillInfo?.certifications || [],
            courses: skillInfo?.courses || [],
            relatedSkills: skillInfo?.relatedSkills?.filter(rs => !normalizedUserSkills.includes(rs)) || []
          });
        }
      });

    // Add high-demand skills from our database that aren't in job listings
    highDemandSkills.forEach(skill => {
      const alreadyIncluded = gapAnalysis.some(sg => sg.skill === skill);
      const hasSkill = normalizedUserSkills.some((us: string) => us === skill || us.includes(skill) || skill.includes(us));
      
      if (!alreadyIncluded && !hasSkill && skillDatabase[skill]) {
        const info = skillDatabase[skill];
        gapAnalysis.push({
          skill,
          demandLevel: info.demand,
          category: info.category,
          averageSalaryBoost: info.avgSalaryBoost,
          matchingJobs: 0,
          sampleJobs: [],
          certifications: info.certifications,
          courses: info.courses,
          relatedSkills: info.relatedSkills.filter(rs => !normalizedUserSkills.includes(rs)),
          isRecommended: true
        });
      }
    });

    // Sort by priority (job count + salary boost + demand level)
    const sortedGaps = gapAnalysis
      .sort((a, b) => {
        const scoreA = (a.matchingJobs * 2) + a.averageSalaryBoost + (a.demandLevel === "high" ? 20 : a.demandLevel === "medium" ? 10 : 0);
        const scoreB = (b.matchingJobs * 2) + b.averageSalaryBoost + (b.demandLevel === "high" ? 20 : b.demandLevel === "medium" ? 10 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 15);

    // Generate course recommendations from skill gaps
    const recommendations: any[] = [];
    sortedGaps.slice(0, 8).forEach(gap => {
      if (gap.courses && gap.courses.length > 0) {
        gap.courses.forEach((course: any) => {
          if (recommendations.length < 10) {
            recommendations.push({
              ...course,
              skills: [gap.skill],
              relatedGap: gap.skill
            });
          }
        });
      }
    });

    // If we don't have enough recommendations, add generic ones
    if (recommendations.length < 5) {
      sortedGaps.slice(0, 5 - recommendations.length).forEach(gap => {
        recommendations.push({
          title: `Complete ${gap.skill.charAt(0).toUpperCase() + gap.skill.slice(1)} Course`,
          provider: "Udemy",
          url: `https://www.udemy.com/courses/search/?q=${encodeURIComponent(gap.skill)}`,
          duration: "10-20 hours",
          level: gap.demandLevel === "high" ? "Intermediate" : "Beginner",
          skills: [gap.skill],
          relatedGap: gap.skill
        });
      });
    }

    // Calculate scores
    const totalRequiredSkills = Object.keys(skillDemand).length;
    const currentSkillsScore = totalRequiredSkills > 0 
      ? Math.min(100, Math.round((matchedSkills.length / totalRequiredSkills) * 100 * 1.5))
      : (normalizedUserSkills.length > 0 ? 50 : 0);
    
    const marketDemandScore = sortedGaps.length > 0 
      ? Math.max(20, 100 - sortedGaps.length * 5)
      : 100;

    // Top paying skills from job market
    const topPayingSkills = Object.entries(skillDemand)
      .sort((a, b) => b[1].totalBudget - a[1].totalBudget)
      .slice(0, 8)
      .map(([skill]) => skill);

    // Calculate improvement potential
    const improvementPotential = Math.min(60, sortedGaps.slice(0, 5).reduce((acc, g) => acc + (g.averageSalaryBoost || 10) / 5, 0));

    // Collect all certifications from gaps
    const allCertifications: any[] = [];
    sortedGaps.forEach(gap => {
      if (gap.certifications && gap.certifications.length > 0) {
        gap.certifications.forEach((cert: any) => {
          if (!allCertifications.some(c => c.name === cert.name)) {
            allCertifications.push({
              ...cert,
              skill: gap.skill
            });
          }
        });
      }
    });

    const result = {
      currentSkillsScore,
      marketDemandScore,
      gapAnalysis: sortedGaps,
      recommendations: recommendations.slice(0, 10),
      certifications: allCertifications.slice(0, 10),
      topPayingSkills,
      improvementPotential: Math.round(improvementPotential),
      matchedSkills,
      totalJobsAnalyzed: highPayingJobs?.length || 0
    };

    console.log("Rule-based analysis complete:", { 
      gapsFound: sortedGaps.length, 
      recommendationsCount: recommendations.length,
      certificationsCount: allCertifications.length 
    });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error: any) {
    console.error("Error in skill-gap-analysis:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
