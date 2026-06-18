Feature: TodoMVC Task Management
  As a user of the TodoMVC application
  I want to manage my daily tasks
  So that I can stay organised and productive

  Background:
    Given I am on the TodoMVC application

  # ── Add Todos ──────────────────────────────────────────────────────────────

  @smoke @add
  Scenario: Add a single todo item
    When I add a todo "Buy groceries"
    Then I should see 1 todo item
    And the todo "Buy groceries" should be visible

  @regression @add
  Scenario: Add multiple todo items
    When I add a todo "Buy groceries"
    And I add a todo "Walk the dog"
    And I add a todo "Read a book"
    Then I should see 3 todo items

  # ── Complete Todos ─────────────────────────────────────────────────────────

  @smoke @complete
  Scenario: Complete a todo item
    Given I have added a todo "Buy groceries"
    When I complete todo number 1
    Then todo number 1 should be marked as completed

  @regression @complete
  Scenario: Complete one of multiple todos
    Given I have added a todo "Buy groceries"
    And I have added a todo "Walk the dog"
    When I complete todo number 1
    Then todo number 1 should be marked as completed
    And todo number 2 should not be marked as completed

  # ── Delete Todos ───────────────────────────────────────────────────────────

  @regression @delete
  Scenario: Delete a todo item
    Given I have added a todo "Buy groceries"
    And I have added a todo "Walk the dog"
    When I delete todo number 1
    Then I should see 1 todo item
    And the todo "Walk the dog" should be visible

  # ── Filter Todos ───────────────────────────────────────────────────────────

  @regression @filter
  Scenario: Filter active todos
    Given I have added a todo "Buy groceries"
    And I have added a todo "Walk the dog"
    When I complete todo number 1
    And I filter todos by "Active"
    Then I should see 1 todo item

  @regression @filter
  Scenario: Filter completed todos
    Given I have added a todo "Buy groceries"
    And I have added a todo "Walk the dog"
    When I complete todo number 1
    And I filter todos by "Completed"
    Then I should see 1 todo item

  @smoke @filter
  Scenario: Return to all todos view
    Given I have added a todo "Buy groceries"
    And I have added a todo "Walk the dog"
    When I complete todo number 1
    And I filter todos by "Active"
    And I filter todos by "All"
    Then I should see 2 todo items

  # ── Clear Completed ────────────────────────────────────────────────────────

  @regression @clear
  Scenario: Clear all completed todos
    Given I have added a todo "Buy groceries"
    And I have added a todo "Walk the dog"
    When I complete todo number 1
    And I clear completed todos
    Then I should see 1 todo item
    And the todo "Walk the dog" should be visible
