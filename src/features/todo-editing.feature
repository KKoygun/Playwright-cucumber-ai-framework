Feature: Todo Editing

  Background:
    Given I am on the TodoMVC application

  @edit @smoke
  Scenario: Editing a Todo Item
    Given I have added a todo "Buy milk"
    When I double-click the todo "Buy milk" and type "Buy eggs" and press Enter
    Then the todo "Buy eggs" should be visible

  @edit
  Scenario: Editing a Todo Item Does Not Change the Total Count
    Given I have added a todo "Buy milk"
    And I have added a todo "Walk the dog"
    When I double-click the todo "Buy milk" and type "Buy eggs" and press Enter
    Then I should see 2 todo items