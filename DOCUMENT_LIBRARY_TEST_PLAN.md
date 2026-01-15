# 🧪 Document Library RAG Test Plan

Use these questions to verify that the RAG system is correctly retrieving Document Library entries and that the LLM is accurately interpreting the markdown tables.

## 📄 QP-IPSR-PSU-003 (English Language Proficiency)
1. **"What are the English proficiency requirements for a PhD student from a country where English is not the medium of instruction?"**
   - *Target Info*: IELTS 6.0, TOEFL 550/80.
   - *Goal*: Verify table row lookup.
2. **"If I am a Master's student, what IELTS score do I need to graduate?"**
   - *Target Info*: IELTS 5.0 (for most fields), 6.0 (for Medical/English fields).
   - *Goal*: Verify granular detail extraction.
3. **"Can I submit my thesis if I haven't met the English requirement yet?"**
   - *Target Info*: No, usually must fulfill before notice of thesis submission.
   - *Goal*: Verify process logic.

## 📄 QP-IPSR-PSU-011 (Change of Research Title)
4. **"What is the process to change my research title?"**
   - *Target Info*: Student applies -> Supervisor supports -> Faculty Board approves -> IPSR notified.
   - *Goal*: Verify sequential step extraction.
5. **"Who needs to approve my application to change my research title?"**
   - *Target Info*: Supervisor, Faculty Representative, Faculty Board.
   - *Goal*: Verify role identification.
6. **"Is there a form I need to fill out to change my research title?"**
   - *Target Info*: Yes, typically mentions "FM-IPSR-PSU-xxx" form.
   - *Goal*: Verify specific entity extraction.

## 📄 QP-IPSR-PSU-013 (Course Waiver)
7. **"How can I apply for a course waiver?"**
   - *Target Info*: Submit application form with supporting docs to Faculty.
   - *Goal*: Verify general process summary.
8. **"What documents do I need to attach with my course waiver application?"**
   - *Target Info*: Certified copies of transcript, syllabus/course outline, mapping of courses.
   - *Goal*: Verify list extraction.
9. **"Who approves the course waiver application?"**
   - *Target Info*: Faculty Board recommends, Senate approves.
   - *Goal*: Verify hierarchy of approval.

## 📄 QP-IPSR-PSU-014 (Conversion Master's to PhD)
10. **"What are the requirements for the Panel of Examiners for conversion to PhD?"**
    - *Target Info*: Must have PhD qualification or equivalent experience, relevant field expertise.
    - *Goal*: Verify retrieval from "Appendix" sections.
11. **"Describe the process for converting from Master's to PhD."**
    - *Target Info*: Intent notification -> Research proposal -> Panel appt -> Oral presentation -> Approval.
    - *Goal*: Verify multi-step complex process reasoning.
12. **"Can the oral presentation for conversion be done online?"**
    - *Target Info*: Yes, per Appendix B/Standard Operating Procedure for online conduct.
    - *Goal*: Verify condition checking.

## 📄 QP-IPSR-PSU-034 (Extension of Candidature)
13. **"When should I apply for an extension of my candidature?"**
    - *Target Info*: Usually X months before max candidature expires.
    - *Goal*: Verify timeline data.
14. **"How many times can I extend my candidature?"**
    - *Target Info*: Max extension limits (e.g., 2 times or specific duration).
    - *Goal*: Verify policy constraints.
15. **"What happens if my extension application is rejected?"**
    - *Target Info*: Candidature may be terminated or must submit immediately.
    - *Goal*: Verify "What-If" scenario handling.
