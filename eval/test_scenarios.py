"""Module 7 gate: one test per data/scenarios folder; docs/CASE_TABLE.md is written at the end, pass or fail."""
import pytest

from eval.case_table import write_case_table
from eval.runner import run_scenario, scenario_folders
from pipeline import load_topology

TOPO = load_topology()
FOLDERS = scenario_folders()
RESULTS = {}


@pytest.fixture(scope="session", autouse=True)
def case_table():
    yield
    if len(RESULTS) == len(FOLDERS):  # a -k subset must not overwrite the full table
        write_case_table([RESULTS[f.name] for f in FOLDERS if f.name in RESULTS])


@pytest.mark.parametrize("folder", FOLDERS, ids=[f.name for f in FOLDERS])
def test_scenario(folder, tmp_path):
    r = RESULTS[folder.name] = run_scenario(folder, TOPO, tmp_path)
    failed = [f"{n}: {w}" for n, ok, w in r.checks if not ok]
    assert not failed, "\n".join(failed)
