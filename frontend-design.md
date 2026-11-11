# Frontend Design and Development Standards

## 1. Input Fields

All input fields should follow consistent validation, usability, and UI standards.

### 1.1 Character Limit

- Define appropriate minimum and maximum character limits for each input field.
- Display character limits where required.
- Prevent unnecessary data entry beyond the defined limit.

### 1.2 Proper Input Types

- Use appropriate Shadcn/input types based on the expected data.
- Examples:
  - Text
  - Number
  - Email
  - Password
  - Date
  - URL
  - Telephone
- Ensure the input type supports proper browser-level validation and user experience.

### 1.3 Zod Validation

- Use **Zod** for schema-based form validation.
- Define validation rules centrally and consistently.
- Provide clear and user-friendly validation messages.
- Avoid duplicating validation logic across multiple components.

### 1.4 Reusable Input Components

- Create reusable input components for commonly used fields.
- Validation, error handling, labels, placeholders, and styling should be configurable through props.
- Avoid creating separate implementations of the same input pattern.

---

## 2. Reusable UI Components

- Components that are used in multiple locations must be developed as reusable components.
- Maintain a consistent component API and naming convention.
- Common reusable components may include:
  - Input fields
  - Buttons
  - Dropdowns
  - Modals
  - Cards
  - Tables
  - Loaders
  - Form controls
  - Date pickers
- Avoid duplicating UI code when the same functionality can be handled through a reusable component.

---

## 3. File and Folder Structuring

Maintain a clean and scalable project structure.

### Guidelines

- Organize files based on features, components, utilities, hooks, services, and pages.
- Keep related files together wherever practical.
- Use consistent naming conventions for files and folders.
- Avoid unnecessarily large files and components.
- Separate business logic from UI components where appropriate.
- Maintain a clear structure that allows developers to easily locate and reuse existing functionality.

---

## 4. Button Consistency

All buttons across the application should follow a consistent design and behavior.

### 4.1 Icons and Labels

- Use icons along with text labels where they improve clarity.
- Maintain consistent icon size, alignment, and spacing.
- Avoid using icons without labels when the action may not be immediately understandable.
- Use a consistent icon library throughout the application.

### 4.2 CSS Consistency

Maintain consistent styling for:

- Border radius
- Border
- Padding
- Font size
- Font weight
- Height
- Icon spacing
- Hover state
- Active state
- Disabled state
- Focus state

Avoid creating multiple CSS variations for the same button type unless there is a specific design requirement.

### 4.3 Loading State

- Display a loader when an action requires processing time.
- Disable the button during ongoing requests where appropriate.
- Prevent duplicate submissions caused by repeated clicks.
- Maintain consistent loader placement and styling across the application.

---

## 5. Text Area

Text areas should provide a consistent and user-friendly experience.

### 5.1 Character Count

- Display the current character count where a character limit is applicable.
- Clearly indicate the maximum allowed characters.
- Prevent or appropriately handle input beyond the defined limit.

### 5.2 Maximum Height

- Define an appropriate maximum height for text areas.
- Prevent text areas from expanding indefinitely and affecting page layout.
- Enable scrolling when the content exceeds the defined maximum height.

---

## 6. Multi-Select and Combo Box

### 6.1 Multi-Select

- Use a standardized reusable multi-select component.
- Support selecting and removing multiple options.
- Provide clear selected-state indicators.
- Handle empty, loading, and disabled states consistently.

### 6.2 Combo Box

- Use a reusable combo box component wherever searchable selection is required.
- Support:
  - Search/filter functionality
  - Single or multiple selection as required
  - Loading state
  - Empty state
  - Disabled state
  - Clear selection where applicable
- Maintain consistent styling and behavior across the application.

---

## 7. Data Table Standards

All data tables should follow a consistent structure and interaction pattern.

### 7.1 Table Consistency

Maintain consistency in:

- Column alignment
- Header styling
- Row spacing
- Typography
- Action buttons
- Empty states
- Loading states
- Error states
- Responsive behavior

### 7.2 Server-Side Pagination

- Implement server-side pagination for large datasets.
- Fetch only the required records for the current page.
- Provide:
  - Current page
  - Page size
  - Total records
  - Next/Previous navigation
- Avoid loading the complete dataset on the client when unnecessary.

---

## 8. Date Validation

### 8.1 Start and End Date Validation

- Validate that the end date is not earlier than the start date.
- Apply appropriate minimum and maximum date restrictions where required.
- Display clear validation messages for invalid date ranges.
- Ensure the same validation logic is applied consistently across forms and filters.

### Example

**Start Date:** 10 September 2026
**End Date:** 15 September 2026
→ Valid date range

**Start Date:** 15 September 2026
**End Date:** 10 September 2026
→ Invalid date range

---

## 9. TanStack Query

Use **TanStack Query** for server-state management and API data handling.

### Guidelines

- Use queries for fetching server data.
- Use mutations for create, update, and delete operations.
- Implement appropriate:
  - Loading states
  - Error states
  - Success handling
  - Cache management
  - Query invalidation
  - Refetching
- Avoid unnecessary API calls and duplicated server-state management.

---

## 10. TanStack Table

Use **TanStack Table** for complex and reusable data-table implementations.

### Guidelines

- Use standardized column definitions.
- Support sorting where required.
- Support filtering where required.
- Integrate server-side pagination for large datasets.
- Maintain reusable table configurations.
- Keep table-related logic separate from unrelated UI logic where practical.

---

# Frontend Development Checklist

### Input Fields

☐ Character limits are defined where required  
☐ Correct input types are used  
☐ Zod validation is implemented  
☐ Validation messages are clear  
☐ Reusable input components are used

### Reusable Components

☐ Repeated UI components are reusable  
☐ Common functionality is not duplicated  
☐ Component naming and APIs are consistent

### File Structure

☐ Project structure is clean and scalable  
☐ Related files are organized logically  
☐ Naming conventions are consistent  
☐ Business logic and UI are appropriately separated

### Buttons

☐ Icons and labels are consistent  
☐ Border and padding are consistent  
☐ Hover/active/disabled states are handled  
☐ Loading state is implemented  
☐ Duplicate submissions are prevented

### Text Areas

☐ Character count is implemented where required  
☐ Maximum height is defined  
☐ Overflow/scroll behavior is handled

### Multi-Select / Combo Box

☐ Reusable component is used  
☐ Search/filter functionality works correctly  
☐ Loading and empty states are handled  
☐ Selected values are clearly displayed

### Data Tables

☐ Table UI is consistent  
☐ Loading and empty states are handled  
☐ Server-side pagination is implemented where required  
☐ Sorting/filtering is implemented where required  
☐ TanStack Table is used where applicable

### Date Validation

☐ Start date and end date are validated  
☐ Invalid date ranges are prevented  
☐ Appropriate validation messages are displayed

### Data Fetching

☐ TanStack Query is used for server-state management  
☐ Queries and mutations are implemented appropriately  
☐ Cache invalidation is handled correctly  
☐ Unnecessary API calls are avoided

### Overall Quality

☐ UI is consistent across screens  
☐ Components are reusable  
☐ Validation is consistent  
☐ Loading and error states are handled  
☐ Code is maintainable and scalable  
☐ No unnecessary duplication exists
