package com.example.expensetracker.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.expensetracker.model.Expense;
import com.example.expensetracker.repository.ExpenseRepository;

@Service
public class ExpenseService {

    @Autowired
    private ExpenseRepository repository;

    public Expense saveExpense(Expense expense){
        return repository.save(expense);
    }

    public List<Expense> getAllExpenses(){
        return repository.findAll();
    }

    public void deleteExpense(Long id){
        repository.deleteById(id);
    }
}
